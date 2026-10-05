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
import { site } from '@/lib/site';

export function ContactDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>Contact</DialogTrigger>
      <DialogContent className="text-center">
        <DialogHeader className="items-center">
          <DialogTitle>Interested in working together?</DialogTitle>
          <DialogDescription>Feel free to send me a mail!</DialogDescription>
        </DialogHeader>
        <a
          className={buttonVariants({ size: 'lg', className: 'self-center' })}
          href={`mailto:${site.email}`}
        >
          {site.email}
        </a>
      </DialogContent>
    </Dialog>
  );
}
