import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-border">
        <p className="font-serif text-3xl">语声</p>
        <p className="mt-1 text-sm text-muted">用 Google 或 X 登录，随时回来继续朗读。</p>
        <div className="mt-6 space-y-3">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-elevated text-sm font-medium text-fg shadow-border transition-shadow duration-150 hover:shadow-border-hover"
              >
                使用 {p.label} 继续
              </button>
            ))
          ) : (
            <p className="text-sm text-muted">登录已关闭。</p>
          )}
        </div>
        <Link
          to="/"
          className="mt-6 inline-flex h-11 items-center text-sm text-muted hover:text-fg"
        >
          先不用登录，回去朗读
        </Link>
      </div>
    </main>
  );
}
