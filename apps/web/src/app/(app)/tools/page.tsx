import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import type { Metadata } from 'next';
import Link from 'next/link';
import { toolPath, tools } from '@/lib/tools';

export const metadata: Metadata = {
  title: 'Tools',
  description: 'Small tools I built for myself, running right in your browser.',
};

export default function ToolsPage() {
  return (
    <>
      <section className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Tools</h1>
        <p className="text-muted-foreground text-lg">
          Small tools I built for myself, running right in your browser.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 sm:grid-cols-2">
        {tools.length === 0 && <p className="text-muted-foreground">No tools yet.</p>}
        {tools.map((tool) => (
          <Link key={tool.slug} href={toolPath(tool)}>
            <Card className="hover:bg-muted/50 h-full transition-colors">
              <CardHeader>
                <CardTitle className="text-xl">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>
    </>
  );
}
