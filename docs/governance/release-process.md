# FAIL Kit Release Process

---

## Versioning Philosophy

FAIL Kit follows **semantic versioning** with a critical distinction:

**Rules themselves are versionless law.**

Once a rule is accepted and assigned an ID (FK###), it is immutable. The version number applies to:
- The analyzer implementation
- The tooling and CLI
- The documentation structure
- The test framework

But **not** to the rules themselves.

---

## Semantic Versioning

### Format: `MAJOR.MINOR.PATCH`

---

### Patch Release (1.0.x)

**When:**
- Bug fixes in detection logic
- False positive reductions
- Documentation clarifications
- Test case additions
- Performance improvements (non-breaking)

**Examples:**
- Fix FK010 detection to exclude hypothetical statements
- Add test case for FK014 edge case
- Clarify RFC-0001 false positive analysis
- Improve analyzer performance by 20%

**Process:**
1. Merge bug fixes to `main`
2. Run full test suite
3. Update CHANGELOG.md
4. Tag release: `v1.0.x`
5. Publish to npm/PyPI

**Timeline:** As needed, typically weekly or bi-weekly

---

### Minor Release (1.x.0)

**When:**
- New rules added
- New features in tooling
- New integrations
- Non-breaking API additions

**Examples:**
- Add FK041 (new rule)
- Add VSCode extension feature
- Add LangChain integration
- Add new CLI command

**Process:**
1. Merge new rules/features to `main`
2. Run full test suite
3. Update CHANGELOG.md
4. Update documentation
5. Tag release: `v1.x.0`
6. Publish to npm/PyPI
7. Announce in community

**Timeline:** Monthly or when significant features accumulate

---

### Major Release (x.0.0)

**When:**
- Breaking changes to analyzer semantics
- Breaking API changes
- Major architectural changes
- Removal of deprecated features

**Examples:**
- Change receipt schema format
- Rewrite analyzer engine
- Remove deprecated CLI flags
- Change rule detection algorithm fundamentally

**Process:**
1. RFC for breaking change
2. Community review (minimum 30 days)
3. Migration guide preparation
4. Merge to `main`
5. Run full test suite
6. Update all documentation
7. Tag release: `vx.0.0`
8. Publish to npm/PyPI
9. Major announcement
10. Support previous major version for 6 months

**Timeline:** Rarely, only when absolutely necessary

---

## Rule Lifecycle

### New Rule Addition (Minor Release)

**Steps:**
1. RFC accepted
2. Rule ID assigned (FK###)
3. Detection logic implemented
4. Test fixtures created
5. Documentation updated
6. Merged to `main`
7. Released in next minor version

**Rule becomes active immediately upon release.**

---

### Rule Refinement (Patch Release)

**What can change:**
- Detection heuristics (to reduce false positives)
- Severity level (with justification)
- Documentation clarity
- Test case coverage

**What cannot change:**
- Rule ID
- Core failure condition
- Category assignment

**Process:**
1. Issue reported (false positive/negative)
2. Analysis and fix proposed
3. Review and approval
4. Implementation
5. Released in next patch

---

### Rule Deprecation (Minor Release)

**When:**
- Rule superseded by more precise rule
- Rule has unacceptable false positive rate
- Rule no longer relevant

**Process:**
1. Deprecation RFC submitted
2. Community review (minimum 30 days)
3. Maintainer approval
4. Mark rule as deprecated
5. Update documentation
6. Keep rule ID reserved (never reuse)
7. Released in next minor version

**Deprecated rules:**
- Remain in documentation
- Are not enforced by default
- Can be enabled with `--include-deprecated` flag
- Are never deleted

---

## Release Checklist

### Pre-Release

- [ ] All tests passing
- [ ] No open critical bugs
- [ ] CHANGELOG.md updated
- [ ] Version number updated in package files
- [ ] Documentation updated
- [ ] Migration guide (if breaking changes)
- [ ] Release notes drafted

### Release

- [ ] Tag release in Git
- [ ] Build packages
- [ ] Publish to npm
- [ ] Publish to PyPI
- [ ] Update GitHub release
- [ ] Update documentation site

### Post-Release

- [ ] Announce in community
- [ ] Monitor for issues
- [ ] Update examples and demos
- [ ] Update integration guides

---

## Hotfix Process

**When:** Critical bug in production affecting users

**Process:**
1. Create hotfix branch from release tag
2. Implement minimal fix
3. Test thoroughly
4. Merge to `main` and release branch
5. Release as patch version
6. Announce hotfix

**Timeline:** As fast as possible, within 24 hours

---

## Backward Compatibility

### Guarantees

**We guarantee:**
- Rule IDs never change
- Rule core definitions never change
- Receipt schema is backward compatible
- CLI flags are backward compatible (within major version)

**We do not guarantee:**
- Detection heuristics (may improve)
- Performance characteristics
- Internal APIs
- Undocumented behavior

### Breaking Changes

**Breaking changes require:**
- Major version bump
- RFC with 30-day review
- Migration guide
- 6-month support for previous version

**Examples of breaking changes:**
- Change receipt schema format
- Remove CLI command
- Change rule detection algorithm fundamentally
- Remove public API

---

## Support Policy

### Current Version
- Full support
- Bug fixes
- Security patches
- New features

### Previous Minor Version
- Bug fixes
- Security patches
- No new features

### Previous Major Version
- Security patches only
- 6 months after new major release
- Then end-of-life

### End-of-Life
- No support
- No patches
- Users encouraged to upgrade

---

## Security Releases

**When:** Security vulnerability discovered

**Process:**
1. Vulnerability reported privately
2. Maintainers assess severity
3. Fix developed privately
4. Coordinated disclosure
5. Patch released for all supported versions
6. Public announcement after patch available

**Timeline:** As fast as possible, coordinated with reporter

---

## Communication

### Release Announcements

**Channels:**
- GitHub Releases
- Project README
- Community discussions
- Twitter/social media (if applicable)

**Content:**
- What's new
- What's changed
- Migration guide (if needed)
- Known issues
- Contributors

### Deprecation Notices

**Timeline:**
- Announced 1 major version in advance
- Deprecated in next major version
- Removed in following major version

**Example:**
- v1.5.0: Announce deprecation of feature X
- v2.0.0: Mark feature X as deprecated
- v3.0.0: Remove feature X

---

## Release Cadence

### Target Schedule

- **Patch releases:** As needed (weekly/bi-weekly)
- **Minor releases:** Monthly
- **Major releases:** Yearly or less

### Actual Schedule

Releases happen when ready, not on fixed dates. Quality over schedule.

---

## Emergency Procedures

### Critical Bug

**Definition:** Bug that causes incorrect rule detection or data loss

**Process:**
1. Immediate hotfix
2. Release within 24 hours
3. Announce widely
4. Post-mortem

### Security Vulnerability

**Definition:** Bug that could be exploited for malicious purposes

**Process:**
1. Private fix development
2. Coordinated disclosure
3. Patch all supported versions
4. Public announcement
5. Post-mortem

---

## Changelog Format

### Structure

```markdown
# Changelog

## [Unreleased]

### Added
- New features

### Changed
- Changes to existing features

### Deprecated
- Features marked for removal

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security patches

## [1.2.0] - 2025-01-04

### Added
- FK041: New rule for X
- CLI command for Y

### Fixed
- FK010: Reduced false positives for hypothetical statements
```

### Guidelines

- Keep a changelog for every release
- Group changes by type
- Link to RFCs for new rules
- Credit contributors
- Link to issues/PRs

---

## Metrics

### Release Health

Track:
- Time to release
- Test coverage
- Bug count
- False positive rate
- Community feedback

### Rule Adoption

Track:
- Rules enabled by default
- Rules opted into
- Rules disabled
- Deprecation usage

---

## Future Improvements

As FAIL Kit matures:
- Automated release process
- Continuous deployment
- Beta/alpha channels
- Release candidates
- LTS (Long-Term Support) versions

---

**No trace, no ship.**
