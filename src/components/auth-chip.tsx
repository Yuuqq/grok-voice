import { Link } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { authEnabled, signOut } from "@/lib/auth/client";

export function AuthChip() {
  const { user, isPending } = useCurrentUserState();

  if (isPending) {
    return <div className="size-9 animate-pulse rounded-full bg-elevated" />;
  }

  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex h-11 items-center rounded-full bg-elevated px-4 text-sm font-medium text-fg shadow-[var(--shadow-border)] transition-shadow duration-150 hover:shadow-[var(--shadow-border-hover)]"
      >
        登录
      </Link>
    );
  }

  const label = user.displayName ?? user.primaryEmail ?? "账户";

  return (
    <div className="flex items-center gap-2">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt=""
          className="size-8 rounded-full object-cover outline outline-1 -outline-offset-1 outline-fg/10"
        />
      ) : (
        <span className="grid size-8 place-items-center rounded-full bg-elevated font-serif text-sm text-primary">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="hidden max-w-28 truncate text-sm text-muted sm:inline">
        {label}
      </span>
      {authEnabled && (
        <button
          type="button"
          onClick={() => void signOut()}
          className="h-11 px-2 text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          退出
        </button>
      )}
    </div>
  );
}
