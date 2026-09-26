/* Basic configuration of Vercel.
  It can configure and override the behavior of Vercel in a project.
For more information and possibilities, view https://vercel.com/docs/project-configuration/vercel-ts
*/

import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  regions: ['fra1'],
  cleanUrls: true,
  framework: 'nextjs',
  installCommand: 'npm i',
  git: {
    deploymentEnabled: {
      'experiment/*': false,
      'test/*': false,
    },
  },
};
