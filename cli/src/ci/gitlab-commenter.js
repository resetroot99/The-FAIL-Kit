/**
 * F.A.I.L. Kit GitLab Integration
 *
 * Post audit results as MR notes and update merge request status.
 */

const https = require('https');

/**
 * Get GitLab context from environment
 */
function getGitLabContext() {
  const projectId = process.env.CI_PROJECT_ID;
  const projectPath = process.env.CI_PROJECT_PATH;
  const mrIid = process.env.CI_MERGE_REQUEST_IID;
  const commitSha = process.env.CI_COMMIT_SHA;
  const pipelineId = process.env.CI_PIPELINE_ID;
  
  return {
    projectId,
    projectPath,
    commitSha,
    pipelineId,
    branch: process.env.CI_COMMIT_BRANCH,
    refName: process.env.CI_COMMIT_REF_NAME,
    jobId: process.env.CI_JOB_ID,
    jobName: process.env.CI_JOB_NAME,
    mergeRequest: mrIid ? {
      iid: parseInt(mrIid, 10),
      sourceBranch: process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME,
      targetBranch: process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME,
      title: process.env.CI_MERGE_REQUEST_TITLE,
    } : null,
    apiUrl: process.env.CI_API_V4_URL || 'https://gitlab.com/api/v4',
  };
}

/**
 * Make GitLab API request
 */
async function gitlabRequest(method, path, body = null, token = null, apiUrl = null) {
  const authToken = token || process.env.GITLAB_TOKEN || process.env.CI_JOB_TOKEN;
  const baseUrl = apiUrl || process.env.CI_API_V4_URL || 'https://gitlab.com/api/v4';
  
  if (!authToken) {
    throw new Error('GITLAB_TOKEN or CI_JOB_TOKEN environment variable is required');
  }
  
  const url = new URL(path, baseUrl);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'PRIVATE-TOKEN': authToken,
        'User-Agent': 'F.A.I.L.-Kit-CI',
      },
    };
    
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
          reject(new Error(`GitLab API error ${res.statusCode}: ${data}`));
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
 * Find existing F.A.I.L. Kit note on MR
 */
async function findExistingNote(context) {
  const { projectId, mergeRequest, apiUrl } = context;
  
  if (!mergeRequest) return null;
  
  try {
    const notes = await gitlabRequest(
      'GET',
      `/projects/${projectId}/merge_requests/${mergeRequest.iid}/notes`,
      null,
      null,
      apiUrl
    );
    
    return notes.find(n => 
      n.body.includes('F.A.I.L. Kit Audit') && 
      (n.system === false || n.author?.username?.includes('bot'))
    );
  } catch (error) {
    console.warn('Could not fetch existing notes:', error.message);
    return null;
  }
}

/**
 * Post or update note on MR
 */
async function postGitLabComment(content, context, options = {}) {
  const { projectId, mergeRequest, apiUrl } = context;
  
  if (!mergeRequest) {
    throw new Error('Not a merge request context');
  }
  
  // Check for existing note to update
  const existingNote = options.updateExisting !== false 
    ? await findExistingNote(context)
    : null;
  
  if (existingNote) {
    // Update existing note
    return gitlabRequest(
      'PUT',
      `/projects/${projectId}/merge_requests/${mergeRequest.iid}/notes/${existingNote.id}`,
      { body: content },
      null,
      apiUrl
    );
  } else {
    // Create new note
    return gitlabRequest(
      'POST',
      `/projects/${projectId}/merge_requests/${mergeRequest.iid}/notes`,
      { body: content },
      null,
      apiUrl
    );
  }
}

/**
 * Create a commit status
 */
async function createGitLabCommitStatus(options) {
  const { state, name, description, context, targetUrl } = options;
  const { projectId, commitSha, apiUrl } = context;
  
  return gitlabRequest(
    'POST',
    `/projects/${projectId}/statuses/${commitSha}`,
    {
      state, // 'pending', 'running', 'success', 'failed', 'canceled'
      name: name || 'F.A.I.L. Kit Audit',
      description: description?.substring(0, 255),
      target_url: targetUrl,
      coverage: options.coverage,
    },
    null,
    apiUrl
  );
}

/**
 * Add labels to MR
 */
async function addMRLabels(labels, context) {
  const { projectId, mergeRequest, apiUrl } = context;
  
  if (!mergeRequest) return;
  
  // First get current labels
  const mr = await gitlabRequest(
    'GET',
    `/projects/${projectId}/merge_requests/${mergeRequest.iid}`,
    null,
    null,
    apiUrl
  );
  
  const currentLabels = mr.labels || [];
  const newLabels = [...new Set([...currentLabels, ...labels])];
  
  return gitlabRequest(
    'PUT',
    `/projects/${projectId}/merge_requests/${mergeRequest.iid}`,
    { labels: newLabels.join(',') },
    null,
    apiUrl
  );
}

/**
 * Update MR merge status (approval rules)
 * Note: This requires project-level configuration for blocking merges
 */
async function updateGitLabMergeability(context, canMerge, reason) {
  const { projectId, mergeRequest, commitSha, apiUrl, pipelineId } = context;
  
  if (!mergeRequest) return;
  
  // Create external status check if available (GitLab Premium feature)
  // For free tier, we use commit status which can be configured as required
  
  const state = canMerge ? 'success' : 'failed';
  
  return createGitLabCommitStatus({
    state,
    name: 'F.A.I.L. Kit / Forensic Audit',
    description: reason || (canMerge ? 'Audit passed' : 'Audit failed - merge blocked'),
    context,
    targetUrl: pipelineId 
      ? `${process.env.CI_PROJECT_URL}/-/pipelines/${pipelineId}`
      : undefined,
  });
}

/**
 * Create MR discussion thread (for detailed findings)
 */
async function createMRDiscussion(title, content, context) {
  const { projectId, mergeRequest, apiUrl } = context;
  
  if (!mergeRequest) return;
  
  return gitlabRequest(
    'POST',
    `/projects/${projectId}/merge_requests/${mergeRequest.iid}/discussions`,
    {
      body: `## ${title}\n\n${content}`,
    },
    null,
    apiUrl
  );
}

/**
 * Resolve MR discussion thread
 */
async function resolveMRDiscussion(discussionId, context) {
  const { projectId, mergeRequest, apiUrl } = context;
  
  if (!mergeRequest) return;
  
  return gitlabRequest(
    'PUT',
    `/projects/${projectId}/merge_requests/${mergeRequest.iid}/discussions/${discussionId}`,
    { resolved: true },
    null,
    apiUrl
  );
}

/**
 * Award emoji to MR (visual indicator)
 */
async function awardMREmoji(emoji, context) {
  const { projectId, mergeRequest, apiUrl } = context;
  
  if (!mergeRequest) return;
  
  try {
    return await gitlabRequest(
      'POST',
      `/projects/${projectId}/merge_requests/${mergeRequest.iid}/award_emoji`,
      { name: emoji },
      null,
      apiUrl
    );
  } catch (error) {
    // Emoji may already be awarded
    console.warn('Could not award emoji:', error.message);
  }
}

module.exports = {
  getGitLabContext,
  gitlabRequest,
  postGitLabComment,
  createGitLabCommitStatus,
  addMRLabels,
  updateGitLabMergeability,
  createMRDiscussion,
  resolveMRDiscussion,
  awardMREmoji,
  findExistingNote,
};
