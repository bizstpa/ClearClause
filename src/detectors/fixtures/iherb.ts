// Excerpts modeled on the iHerb Privacy Policy CCPA notice (the policy that
// exposed the run-on segmentation bug and the non-monetary "consideration"
// sale phrasing). Short excerpts only — see corpus/README.md for the
// copyright stance on committing policy text.

// Heading + intro sentence + a list of sources/categories where each item is
// its own line with NO terminal punctuation. Before the line-break fix this
// whole block collapsed into one giant "sentence".
export const iherbRunOnBlock = `Sources of Personal Information
We obtain the categories of Personal Information listed above from the following categories of sources:
Directly from you, for example, from forms you complete or products and services you purchase
Indirectly from you, for example, from observing your actions on our Sites
Advertising networks
Internet service providers
Data analytics providers
Government entities
Operating systems and platforms
Social networks
Data brokers`;

// The deny-then-consideration two-step: a no-monetary-sale sentence followed
// by the sentence that describes a sale for non-monetary consideration
// without ever using "sell" affirmatively, then an assertion of past sales.
export const iherbSaleParagraph = `Sale of Personal Information
We do not sell Personal Information in exchange for monetary compensation. We may allow certain third parties (such as online advertising services) to collect your Personal Information via automated technologies on our Sites in exchange for non-monetary consideration, such as an enhanced ability to serve you content and advertisements that may be of interest to you. In the preceding twelve (12) months, we may have sold the following categories of Personal Information to third parties: identifiers, commercial information, and internet or other electronic network activity information.`;

// Sentences about the user's rights REGARDING sale — these mention selling
// but are not the company asserting a sale, and must not dilute the finding.
export const iherbRightsSentences = `You have the right to direct us to not sell your Personal Information at any time (the "right to opt-out"). To exercise the right to opt-out of the sale of your Personal Information, you may submit a request to us. You may request that we disclose to you the categories of Personal Information we have collected, sold, or disclosed for a business purpose in the preceding twelve (12) months.`;
