/**
 * F.A.I.L. Kit GitHub Integration
 *
 * Post audit results as PR comments and create check runs.
 * Works with GitHub Actions and standalone GitHub API access.
 */

const https = require('https');

/**
 * Get GitHub context from environment
 */
function getGitHubContext() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  let event = {};
  
  if (eventPath) {
    try {
      event = require(eventPath);
    } catch (e) {
      // Ignore - event file may not exist
    }
  }
  
  return {
    owner: process.env.GITHUB_REPOSITORY?.split('/')[0] || event.repository?.owner?.login,
    repo: process.env.GITHUB_REPOSITORY?.split('/')[1] || event.repository?.name,
    sha: process.env.GITHUB_SHA || event.pull_request?.head?.sha || event.after,
    ref: process.env.GITHUB_REF,
    workflow: process.env.GITHUB_WORKFLOW,
    runId: process.env.GITHUB_RUN_ID,
    runNumber: process.env.GITHUB_RUN_NUMBER,
    actor: process.env.GITHUB_ACTOR,
    pullRequest: event.pull_request ? {
      number: event.pull_request.number,
      title: event.pull_request.title,
      base: event.pull_request.base?.ref,
      head: event.pull_request.head?.ref,
    } : null,
    event,
  };
}

/**
 * Make GitHub API request
 */
async function githubRequest(method, path, body = null, token = null) {
  const authToken = token || process.env.GITHUB_TOKEN;
  
  if (!authToken) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${authToken}`,
        'User-Agent': 'F.A.I.L.-Kit-CI',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };
    
    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`GitHub API error ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

/**
 * Find existing F.A.I.L. Kit comment on PR
 */
async function findExistingComment(context) {
  const { owner, repo, pullRequest } = context;
  
  if (!pullRequest) return null;
  
  try {
    const comments = await githubRequest(
      'GET',
      `/repos/${owner}/${repo}/issues/${pullRequest.number}/comments`
    );
    
    return comments.find(c => 
      c.body.includes('F.A.I.L. Kit Audit') && 
      c.user?.type === 'Bot'
    );
  } catch (error) {
    console.warn('Could not fetch existing comments:', error.message);
    return null;
  }
}

/**
 * Post or update comment on PR
 */
async function postGitHubComment(content, context, options = {}) {
  const { owner, repo, pullRequest } = context;
  
  if (!pullRequest) {
    throw new Error('Not a pull request context');
  }
  
  // Check for existing comment to update
  const existingComment = options.updateExisting !== false 
    ? await findExistingComment(context)
    : null;
  
  if (existingComment) {
    // Update existing comment
    return githubRequest(
      'PATCH',
      `/repos/${owner}/${repo}/issues/comments/${existingComment.id}`,
      { body: content }
    );
  } else {
    // Create new comment
    return githubRequest(
      'POST',
      `/repos/${owner}/${repo}/issues/${pullRequest.number}/comments`,
      { body: content }
    );
  }
}

/**
 * Create a check run for merge blocking
 */
async function createGitHubCheckRun(options) {
  const { name, conclusion, summary, context } = options;
  const { owner, repo, sha } = context;
  
  const body = {
    name,
    head_sha: sha,
    status: 'completed',
    conclusion, // 'success', 'failure', 'neutral', 'cancelled', 'skipped', 'timed_out', 'action_required'
    output: {
      title: `F.A.I.L. Kit: ${conclusion === 'success' ? 'Passed' : conclusion === 'failure' ? 'Failed' : 'Needs Review'}`,
      summary,
    },
    completed_at: new Date().toISOString(),
  };
  
  try {
    return await githubRequest(
      'POST',
      `/repos/${owner}/${repo}/check-runs`,
      body
    );
  } catch (error) {
    // Check runs require additional permissions - fallback to commit status
    console.warn('Could not create check run, falling back to commit status:', error.message);
    return createCommitStatus(options);
  }
}

/**
 * Create commit status (fallback for check runs)
 */
async function createCommitStatus(options) {
  const { name, conclusion, summary, context } = options;
  const { owner, repo, sha } = context;
  
  const state = conclusion === 'success' ? 'success' : 
                conclusion === 'failure' ? 'failure' : 'pending';
  
  return githubRequest(
    'POST',
    `/repos/${owner}/${repo}/statuses/${sha}`,
    {
      state,
      context: name,
      description: summary.substring(0, 140),
      target_url: process.env.GITHUB_SERVER_URL 
        ? `${process.env.GITHUB_SERVER_URL}/${owner}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : undefined,
    }
  );
}

/**
 * Add labels to PR based on audit results
 */
async function addPRLabels(labels, context) {
  const { owner, repo, pullRequest } = context;
  
  if (!pullRequest) return;
  
  return githubRequest(
    'POST',
    `/repos/${owner}/${repo}/issues/${pullRequest.number}/labels`,
    { labels }
  );
}

/**
 * Request changes on PR (for critical failures)
 */
async function requestChanges(body, context) {
  const { owner, repo, pullRequest, sha } = context;
  
  if (!pullRequest) return;
  
  return githubRequest(
    'POST',
    `/repos/${owner}/${repo}/pulls/${pullRequest.number}/reviews`,
    {
      commit_id: sha,
      body,
      event: 'REQUEST_CHANGES',
    }
  );
}

/**
 * Approve PR (for passing audits)
 */
async function approvePR(body, context) {
  const { owner, repo, pullRequest, sha } = context;
  
  if (!pullRequest) return;
  
  return githubRequest(
    'POST',
    `/repos/${owner}/${repo}/pulls/${pullRequest.number}/reviews`,
    {
      commit_id: sha,
      body,
      event: 'APPROVE',
    }
  );
}

module.exports = {
  getGitHubContext,
  githubRequest,
  postGitHubComment,
  createGitHubCheckRun,
  createCommitStatus,
  addPRLabels,
  requestChanges,
  approvePR,
  findExistingComment,
};
