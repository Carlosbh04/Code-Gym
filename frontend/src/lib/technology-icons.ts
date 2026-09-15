import cssIcon from '@/assets/technologies/css.png';
import htmlIcon from '@/assets/technologies/html.png';
import nodejsIcon from '@/assets/technologies/icons8-nodejs-96.png';
import reactIcon from '@/assets/technologies/icons8-reaccionar-96.png';
import sqlIcon from '@/assets/technologies/icons8-sql-96.png';
import javascriptIcon from '@/assets/technologies/javascript.png';

/** Assets visuales disponibles, indexados por el id canónico de tecnología. */
export const technologyIcons: Readonly<Partial<Record<string, string>>> = Object.freeze({
  javascript: javascriptIcon,
  html: htmlIcon,
  css: cssIcon,
  react: reactIcon,
  nodejs: nodejsIcon,
  sql: sqlIcon,
});

export function getTechnologyIcon(technologyId: string): string | undefined {
  return technologyIcons[technologyId.trim().toLocaleLowerCase('en-US')];
}
