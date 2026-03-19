import { memo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ChildProfile } from "@/hooks/useParentData";

interface Props {
  children: ChildProfile[];
  selectedChildId: string;
  onSelect: (id: string) => void;
}

function ChildSelector({ children, selectedChildId, onSelect }: Props) {
  const child = children.find((c) => c.id === selectedChildId);

  return (
    <div className="space-y-4">
      {children.length > 1 && (
        <Select value={selectedChildId} onValueChange={onSelect}>
          <SelectTrigger className="w-full sm:w-[240px] h-10 text-sm font-medium">
            <SelectValue placeholder="Select child" />
          </SelectTrigger>
          <SelectContent>
            {children.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.first_name} {c.last_name} {c.adm_no ? `(${c.adm_no})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {child && (
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4 shadow-sm">
          {child.passport_url ? (
            <img
              src={child.passport_url}
              alt=""
              className="w-16 h-16 rounded-2xl object-cover border-2 border-primary/20"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
              {child.first_name?.[0]}
              {child.last_name?.[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-lg font-black text-foreground truncate">
              {child.first_name} {child.last_name}
            </p>
            <p className="text-sm text-muted-foreground">
              Adm No: <span className="font-semibold text-foreground">{child.adm_no || "—"}</span>
              {child.gender && (
                <span className="ml-3 capitalize">{child.gender}</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ChildSelector);
