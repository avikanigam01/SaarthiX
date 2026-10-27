import { Check, Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";
import { LANGUAGES } from "@/i18n/languages";
import { cn } from "@/lib/utils";

/** Language picker. Each language is shown in its own script so people can spot theirs without reading English. */
export function LanguageSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} className={cn("gap-1.5", className)} aria-label={`${t("lang.label")}: ${current?.native ?? ""}`}>
          <Languages className="size-4" aria-hidden="true" />
          {compact ? null : <span className="hidden text-sm sm:inline">{current?.native}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] w-48 overflow-y-auto">
        <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("lang.choose")}</p>
        {LANGUAGES.map((l) => (
          <DropdownMenuItem key={l.code} onSelect={() => setLang(l.code)} className="flex items-center justify-between gap-3">
            <span>
              <span className="text-sm font-medium">{l.native}</span>
              {l.code !== "en" ? <span className="ml-2 text-xs text-muted-foreground">{l.english}</span> : null}
            </span>
            {l.code === lang ? <Check className="size-4 text-brand" aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
