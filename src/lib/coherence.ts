import type { Country, Quadrant } from '../data/types';

export interface CoherenceAdvice {
  direction: string;
  actions: string[];
}

const QUADRANT_DESCRIPTIONS: Record<Quadrant, string> = {
  theatre:
    'Strategies, laws, and institutions accumulate faster than the capacity to enforce, evaluate, or renegotiate. The priority is building substantive capacity to close the gap.',
  interdep:
    'Formal architecture matched by operational capacity. The state can enforce against major providers and bargain credibly. The priority is maintaining coherence as the frontier shifts.',
  adhoc:
    'Capacity outruns formal architecture. Ecosystems, private investment, or diaspora networks generate capability without state-led planning. The priority is formalising what works.',
  depend:
    'Limited formal architecture and limited substantive capacity. The state is a passive recipient of AI systems built, governed, and operated elsewhere. The priority is building both dimensions simultaneously.',
};

export function getQuadrantDescription(q: Quadrant): string {
  return QUADRANT_DESCRIPTIONS[q];
}

export function getCoherenceAdvice(country: Country): CoherenceAdvice {
  const { quadrant, formal_score, substantive_score, gap } = country;

  switch (quadrant) {
    case 'theatre':
      return {
        direction: `Move right toward the coherence line — close the ${gap}-point gap by building substantive capacity.`,
        actions: [
          'Stand up a dedicated AI regulatory unit with enforcement powers, not just advisory mandates',
          'Shift procurement from turnkey vendor contracts to evaluated, auditable deployments',
          'Invest in national assurance capacity: test labs, audit registries, public evaluation benchmarks',
          'Train regulatory staff on algorithmic impact assessment — not strategy drafting',
          'Pilot enforcement: investigate one major platform deployment using existing data protection law',
        ],
      };

    case 'interdep':
      return {
        direction: 'Maintain position near the coherence line — sustain the balance between declaration and capacity as the frontier shifts.',
        actions: [
          'Keep regulatory institutions funded and staffed at pace with technological change',
          'Publish enforcement outcomes: fines, audits, remediation orders — to demonstrate teeth',
          'Expand mutual recognition agreements with other states in the quadrant',
          'Invest in national AI safety evaluation labs — anticipate the next wave',
          'Share institutional designs with states in the Theatre quadrant through south-south cooperation',
        ],
      };

    case 'adhoc':
      return {
        direction: `Move up toward the coherence line — formalise the ${Math.abs(gap)}-point capability advantage into durable architecture.`,
        actions: [
          'Pass enabling legislation that recognises the existing ecosystem rather than importing foreign templates',
          'Create lightweight regulatory sandboxes that channel informal capacity, not suppress it',
          'Formalise diaspora and private-sector partnerships as national infrastructure',
          'Build a national AI registry: map who is deploying what, before regulating',
          'Document local AI applications as evidence base for a national strategy grounded in practice',
        ],
      };

    case 'depend':
      return {
        direction: 'Move diagonally toward the coherence line — build formal and substantive capacity together.',
        actions: [
          'Start with one sector: pick health, agriculture, or education and build end-to-end AI governance there',
          'Draft a national AI strategy anchored in existing sectoral data — not aspiration',
          'Build a small regulatory team inside an existing digital authority rather than creating a new agency',
          'Negotiate technology transfer clauses into the next major platform procurement',
          'Join regional AI governance initiatives to pool capacity across borders',
        ],
      };

    default:
      return {
        direction: 'Assess formal and substantive sovereignty to determine coherence trajectory.',
        actions: [],
      };
  }
}
