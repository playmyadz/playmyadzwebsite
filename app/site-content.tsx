import source from '../public/site/index.html?raw';

const markup = (source.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? '').replace(
  /<script\s+src="script\.js[^"]*"><\/script>/i,
  '',
);

export function SiteMarkup({ route }: { route: string }) {
  return <div className={`route-page route-${route}`} dangerouslySetInnerHTML={{ __html: markup }} />;
}
