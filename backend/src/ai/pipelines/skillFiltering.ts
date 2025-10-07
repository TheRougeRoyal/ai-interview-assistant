import { z } from 'zod';
import { skillTaxonomy } from '../store/memory';

const SkillFilterSchema = z.object({
  candidateSkills: z.array(z.string()),
  requiredSkills: z.array(z.string()).optional(),
  includeCategories: z.array(z.string()).optional(),
  excludeCategories: z.array(z.string()).optional(),
  topN: z.number().optional(),
});

type SkillFilterInput = z.infer<typeof SkillFilterSchema>;

type FilteredSkill = {
  name: string;
  category: string;
  matchedAs: 'candidate' | 'taxonomy';
  score: number;
};

export function filterSkills(input: SkillFilterInput): FilteredSkill[] {
  const { candidateSkills, requiredSkills, includeCategories, excludeCategories, topN } = SkillFilterSchema.parse(input);

  let filteredSkills = skillTaxonomy.filter(skill => {
    if (requiredSkills && !requiredSkills.includes(skill.name)) {
      return false;
    }
    if (includeCategories && !includeCategories.includes(skill.category)) {
      return false;
    }
    if (excludeCategories && excludeCategories.includes(skill.category)) {
      return false;
    }
    return true;
  });

  const enrichedSkills: FilteredSkill[] = filteredSkills.map(skill => ({
    ...skill,
    matchedAs: candidateSkills.includes(skill.name) ? 'candidate' : 'taxonomy',
    score: candidateSkills.includes(skill.name) ? 1 : 0.5,
  }));

  enrichedSkills.sort((a, b) => b.score - a.score);

  return topN ? enrichedSkills.slice(0, topN) : enrichedSkills;
}