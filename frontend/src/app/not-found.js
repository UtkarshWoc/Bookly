import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="font-display text-8xl font-extrabold text-marigold">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold">This seat doesn’t exist</h1>
      <p className="mt-2 text-ink-soft">The page you were looking for isn’t here.</p>
      <ButtonLink href="/" className="mt-8">
        Browse events
      </ButtonLink>
    </div>
  );
}
