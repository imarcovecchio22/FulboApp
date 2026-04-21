import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchEvent(id: string) {
  try {
    const res = await fetch(`${BASE_URL}/events/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const event = await fetchEvent(params.id);

  if (!event) {
    return {
      title: 'Partido · FULBO',
      description: 'Coordiná el partido con tus amigos en FULBO',
    };
  }

  const playerCount: number = event.participants?.length ?? 0;
  const title = `${event.name} · FULBO`;
  const description =
    playerCount > 0
      ? `${playerCount} jugador${playerCount !== 1 ? 'es' : ''} ya se anotaron. ¡Votá tu disponibilidad!`
      : '¡Unite al partido! Votá tu disponibilidad.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'FULBO',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
