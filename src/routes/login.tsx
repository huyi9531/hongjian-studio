import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, LoaderCircle } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sessionFn, signInFn } from "@/server/functions";

export const Route = createFileRoute("/login")({
  loader: () => sessionFn(),
  component: Login,
});

function Login() {
  const { authenticated } = Route.useLoaderData();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  if (authenticated) void navigate({ to: "/studio" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await signInFn({ data: { password } });
      await navigate({ to: "/studio" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "登录失败，请重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-background pt-16">
      <header className="fixed inset-x-0 top-0 z-10 flex h-16 items-center border-b border-hairline bg-card px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-9 rounded-xl" />
          <span className="font-semibold">红笺</span>
          <span className="hidden border-l border-hairline pl-3 text-sm text-muted-foreground sm:block">
            创作服务平台
          </span>
        </div>
      </header>
      <section className="grid min-h-[calc(100dvh-64px)] place-items-center p-5 sm:p-10">
        <form
          onSubmit={submit}
          className="w-full max-w-md rounded-2xl bg-card p-6 sm:p-8"
        >
          <div className="mb-8">
            <span className="grid size-11 place-items-center rounded-full bg-muted text-foreground">
              <KeyRound size={19} aria-hidden="true" />
            </span>
            <h1 className="mt-6 text-2xl font-semibold">进入工作台</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              输入密码，回到你的工作台。
            </p>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            访问密码
            <Input
              autoFocus
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(error)}
            />
          </label>
          {error && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            className="mt-6 w-full"
            size="lg"
            type="submit"
            disabled={pending}
          >
            {pending && <LoaderCircle className="animate-spin" />}进入工作台
          </Button>
        </form>
      </section>
    </main>
  );
}
