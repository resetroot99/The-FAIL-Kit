# FAIL Kit Contribution & Governance Model

---

## Philosophy

FAIL Kit is not a typical open-source project. It is a **standard-in-progress** that defines what it means for AI systems to be honest.

Because rules have legal, compliance, and safety implications, governance must be:
- **Rigorous:** Every rule must be proven necessary
- **Transparent:** All decisions must be documented
- **Conservative:** Prefer stability over rapid change
- **Adversarial:** Rules must withstand scrutiny

---

## Who Can Contribute

### Anyone Can:
- Propose new rules via RFC
- Report bugs or false positives
- Suggest documentation improvements
- Contribute test cases
- Participate in discussions

### Maintainers Can:
- Approve or reject RFCs
- Merge code changes
- Assign rule IDs
- Deprecate rules
- Make final decisions on disputes

---

## What Can Be Contributed

### ✅ Accepted Contributions

#### 1. New Rules (via RFC)
- Must follow RFC process
- Must conform to rule design contract
- Must not overlap existing rules
- Must be deterministically detectable

#### 2. Test Cases
- Violation examples
- Compliant examples
- Edge case coverage
- Real-world incident reproductions

#### 3. Documentation
- Clarifications
- Examples
- Integration guides
- Use case documentation

#### 4. Bug Fixes
- False positive reductions
- Detection logic improvements
- Performance optimizations

#### 5. Tooling
- CLI enhancements
- IDE integrations
- CI/CD plugins
- Reporting improvements

---

### ❌ Rejected Contributions

#### 1. Style or Quality Rules
FAIL Kit detects falsity, not quality.

**Rejected examples:**
- "Agent uses unprofessional language"
- "Response is too verbose"
- "Code formatting is inconsistent"

#### 2. Intent Inference Rules
Intent is not observable.

**Rejected examples:**
- "Agent deliberately misleads user"
- "Agent tries to hide failures"
- "Agent intends to deceive"

#### 3. Probabilistic Rules
Rules must be deterministic.

**Rejected examples:**
- "Confidence score < 0.7"
- "Likely hallucination"
- "Probably incorrect"

#### 4. Overlapping Rules
Each rule must detect a unique failure mode.

**Rejected examples:**
- New rule that duplicates FK010
- Rule that partially overlaps multiple existing rules

---

## Contribution Process

### 1. Before Contributing

**Read:**
- [Rule Design Contract](../rules/rule-contract.md)
- [Rule Taxonomy](../rules/rule-taxonomy.md)
- [RFC Process](../../rfcs/README.md)

**Check:**
- Does this rule already exist?
- Is this a falsity or a quality judgment?
- Can this be deterministically detected?
- Is there sufficient justification?

---

### 2. Proposing a New Rule

**Steps:**
1. Create RFC following template
2. Submit pull request
3. Engage in review discussion
4. Address feedback
5. Wait for maintainer decision

**Timeline:**
- Minimum 7 days for community review
- Additional time for complex rules
- No fast-track approvals

---

### 3. Contributing Test Cases

**Steps:**
1. Identify rule to test
2. Create JSON fixture following format
3. Include violation and compliant examples
4. Submit pull request

**Test Case Requirements:**
- At least 2 violation examples
- At least 1 compliant example
- Clear descriptions
- Realistic scenarios

---

### 4. Reporting Issues

**Bug Reports:**
- False positive: Rule triggers when it shouldn't
- False negative: Rule doesn't trigger when it should
- Performance issue: Rule is too slow
- Documentation error: Docs are incorrect or unclear

**Issue Template:**
```markdown
## Issue Type
[False Positive / False Negative / Performance / Documentation]

## Rule ID
FK###

## Description
Clear description of the issue

## Reproduction
Steps to reproduce or example that demonstrates the issue

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Suggested Fix
(Optional) How to fix this
```

---

## Governance Structure

### Maintainers

**Responsibilities:**
- Review and approve RFCs
- Merge code changes
- Assign rule IDs
- Resolve disputes
- Maintain project direction

**Authority:**
- Final approval on all RFCs
- Final decision on disputes
- Can request external review
- Can veto changes

**Accountability:**
- All decisions must be documented
- Decisions must be justified
- Decisions can be appealed

---

### Community

**Responsibilities:**
- Propose rules via RFC
- Review RFCs
- Report issues
- Contribute test cases
- Participate in discussions

**Rights:**
- Propose any rule
- Appeal decisions
- Request clarification
- Fork the project

---

### Decision-Making Process

#### RFC Approval
1. Community review (minimum 7 days)
2. Maintainer review
3. Decision: Accept / Reject / Defer
4. Decision documented in RFC
5. If accepted: Implementation and merge

#### Dispute Resolution
1. Issue raised in discussion
2. Maintainers review evidence
3. External review if needed
4. Final decision by maintainers
5. Decision documented

#### Appeals
1. New evidence or revised proposal
2. Re-review by maintainers
3. Final decision

---

## Precedent Rule

**Once a failure mode is named, it must never be unnamed.**

This means:
- Rules are immutable once merged
- Rule IDs are never reused
- Deprecated rules remain documented
- Historical consistency is preserved

**Why this matters:**
- Legal defensibility
- Audit trail integrity
- Community trust
- Standard stability

---

## Versioning and Releases

### Semantic Versioning

- **Patch (1.0.x):** Bug fixes, documentation, test cases
- **Minor (1.x.0):** New rules, new features
- **Major (x.0.0):** Breaking changes to analyzer semantics

**Rules themselves are versionless law.**

Once a rule is accepted, its core definition does not change. Only:
- Severity may be adjusted
- Detection heuristics may be refined
- Documentation may be clarified

---

## Release Process

See [Release Process](./release-process.md) for detailed release procedures.

---

## Code of Conduct

### Expected Behavior

- **Rigorous:** Challenge ideas, not people
- **Respectful:** Disagree professionally
- **Constructive:** Propose solutions, not just problems
- **Patient:** Good governance takes time

### Unacceptable Behavior

- Personal attacks
- Harassment
- Spam or trolling
- Bad faith arguments
- Circumventing review process

### Enforcement

Maintainers may:
- Warn contributors
- Temporarily ban from discussions
- Permanently ban from project
- Report to platform (GitHub, etc.)

---

## Recognition

### Contributors

All contributors are recognized in:
- CHANGELOG.md
- Contributors list
- RFC author credits

### Significant Contributions

Major contributions may be recognized with:
- Maintainer status
- Advisory role
- Public acknowledgment

---

## Future Governance

As FAIL Kit grows, governance may evolve to include:
- Advisory board
- Working groups
- Formal standards body
- Industry partnerships

All governance changes will be:
- Proposed via RFC
- Community reviewed
- Transparently documented

---

## FAQ

### Q: How do I become a maintainer?
**A:** Consistent, high-quality contributions over time. Maintainers are invited, not elected.

### Q: Can I fork FAIL Kit?
**A:** Yes. FAIL Kit is open source. Forks are encouraged for experimentation.

### Q: What if I disagree with a decision?
**A:** You can appeal with new evidence or revised proposal.

### Q: How long does RFC review take?
**A:** Minimum 7 days. Complex rules may take longer.

### Q: Can rules be changed after acceptance?
**A:** Only severity, detection heuristics, and documentation. Core definition is immutable.

---

## Contact

- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** Questions and community discussion
- **RFC Process:** Rule proposals

---

**No trace, no ship.**
