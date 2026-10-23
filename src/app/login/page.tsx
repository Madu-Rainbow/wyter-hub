export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-sm rounded-md border border-border bg-surface p-8">
        <h1 className="mb-2 text-center font-title text-2xl text-text">Wyter Hub</h1>
        <p className="mb-8 text-center text-sm text-text-muted">
          Sistema de gestão da Wyter Consultoria
        </p>
        <form action="/api/auth/signin/google" method="POST">
          <button
            type="submit"
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Entrar com Google
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-text-muted">
          Acesso restrito a membros autorizados da Wyter
        </p>
      </div>
    </div>
  );
}
