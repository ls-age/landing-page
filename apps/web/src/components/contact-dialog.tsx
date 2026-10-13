'use client';

import { Button, buttonVariants } from '@workspace/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog';
import type { ComponentProps } from 'react';
import { site } from '@/lib/site';

const profiles = [
  { label: 'GitHub', href: site.author.github },
  { label: 'Printables', href: site.author.printables },
  { label: 'Instagram', href: site.author.instagram },
];

export function ContactDialog({
  label = 'Contact',
  size,
}: {
  label?: string;
  size?: ComponentProps<typeof Button>['size'];
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button className="drop-shadow" size={size} />}>{label}</DialogTrigger>
      <DialogContent className="text-center">
        <DialogHeader className="items-center">
          <DialogTitle>Interested in working together?</DialogTitle>
          <DialogDescription>Send me an email, or find me on one of these sites.</DialogDescription>
        </DialogHeader>
        <a
          className={buttonVariants({ size: 'lg', className: 'self-center' })}
          href={`mailto:${site.email}`}
        >
          {site.email}
        </a>
        <div className="flex flex-wrap justify-center gap-2">
          {profiles.map(({ label, href }) => (
            <a key={href} className={buttonVariants({ variant: 'outline' })} href={href}>
              {label}
            </a>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
