/**
 * F.A.I.L. Kit Red Team Module
 *
 * Adversarial testing with attack vectors and LLM mutations.
 */

module.exports = {
  ...require('./vectors'),
  ...require('./mutator'),
  ...require('./runner'),
};
