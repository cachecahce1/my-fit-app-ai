"use client";
// PROGRESS PHOTOS — 4 poses per shoot, private bucket, signed URLs only.
// Compare any two dates side by side. Photos every 2 weeks per the plan.
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { todayIST } from "@/lib/plan";

const POSES = [
  { key: "front", label: "Front" },
  { key: "side_left", label: "Side L" },
  { key: "side_right", label: "Side R" },
  { key: "back", label: "Back" },
] as const;
type Pose = (typeof POSES)[number]["key"];

type PhotoRow = {
  id: string;
  log_date: string;
  pose: Pose;
  storage_path: string;
};

/** Downscale to ≤1600px JPEG — keeps detail, kills 12 MB phone originals. */
async function toJpegBlob(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1600 / Math.max(bmp.width, bmp.height), 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85));
}

export default function Photos() {
  const router = useRouter();
  const date = todayIST();
  const qc = useQueryClient();
  const [compare, setCompare] = useState<string[]>([]);
  const [uploadingPose, setUploadingPose] = useState<Pose | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingPose = useRef<Pose | null>(null);

  const { data: photos } = useQuery({
    queryKey: ["photos"],
    queryFn: async () => {
      const { data } = await supabase()
        .from("progress_photos")
        .select("id, log_date, pose, storage_path")
        .order("log_date", { ascending: false });
      return (data ?? []) as PhotoRow[];
    },
  });

  // One signed-URL batch for everything on screen (1 h expiry)
  const { data: urls } = useQuery({
    queryKey: ["photoUrls", photos?.map((p) => p.id).join(",")],
    enabled: !!photos && photos.length > 0,
    queryFn: async () => {
      const { data } = await supabase()
        .storage.from("progress-photos")
        .createSignedUrls(photos!.map((p) => p.storage_path), 3600);
      const map: Record<string, string> = {};
      for (const u of data ?? []) if (u.signedUrl && u.path) map[u.path] = u.signedUrl;
      return map;
    },
  });

  const byDate = useMemo(() => {
    const m = new Map<string, Partial<Record<Pose, PhotoRow>>>();
    for (const p of photos ?? []) {
      if (!m.has(p.log_date)) m.set(p.log_date, {});
      m.get(p.log_date)![p.pose] = p;
    }
    return m;
  }, [photos]);

  const upload = useMutation({
    mutationFn: async ({ pose, file }: { pose: Pose; file: File }) => {
      const { data: u } = await supabase().auth.getUser();
      const uid = u.user!.id;
      const blob = await toJpegBlob(file);
      const path = `${uid}/${date}/${pose}.jpg`;
      const { error: se } = await supabase()
        .storage.from("progress-photos")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (se) throw se;
      // replace any existing row for this date+pose
      await supabase().from("progress_photos").delete().eq("log_date", date).eq("pose", pose);
      const { error } = await supabase()
        .from("progress_photos")
        .insert({ user_id: uid, log_date: date, pose, storage_path: path });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photos"] });
      setUploadingPose(null);
    },
    onError: () => setUploadingPose(null),
  });

  const remove = useMutation({
    mutationFn: async (p: PhotoRow) => {
      await supabase().storage.from("progress-photos").remove([p.storage_path]);
      const { error } = await supabase().from("progress_photos").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos"] }),
  });

  function pickPose(pose: Pose) {
    pendingPose.current = pose;
    fileRef.current?.click();
  }

  const today = byDate.get(date) ?? {};
  const pastDates = [...byDate.keys()];
  const [a, b] = compare;

  function toggleCompare(d: string) {
    setCompare((c) => (c.includes(d) ? c.filter((x) => x !== d) : [...c.slice(-1), d]));
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          const pose = pendingPose.current;
          if (f && pose) {
            setUploadingPose(pose);
            upload.mutate({ pose, file: f });
          }
          e.target.value = "";
        }}
      />

      <header className="rise rise-1">
        <button onClick={() => router.push("/body")} className="tap mb-1 text-sm text-mut">
          ← Body
        </button>
        <h1 className="display text-4xl font-bold uppercase leading-none">Progress photos</h1>
        <p className="mt-1 text-sm text-mut">
          Every 2 weeks · same spot, same light, same distance. Compare week 0 vs 4 vs 8 — never day
          to day.
        </p>
      </header>

      {/* Today's shoot */}
      <section className="card rise rise-2 p-4">
        <p className="label mb-3">Today — {date}</p>
        <div className="grid grid-cols-4 gap-2">
          {POSES.map(({ key, label }) => {
            const row = today[key];
            const url = row && urls?.[row.storage_path];
            return (
              <button
                key={key}
                onClick={() => pickPose(key)}
                className="tap relative aspect-[3/4] overflow-hidden rounded-xl border border-dashed border-line bg-raised"
              >
                {url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={url} alt={label} className="h-full w-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-faint">
                    <span className="text-lg">{uploadingPose === key ? "⏳" : "📷"}</span>
                    <span className="text-[10px] uppercase tracking-wider">{label}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Compare */}
      {a && b && (
        <section className="card rise p-4">
          <p className="label mb-3">
            {a} <span className="text-ember">vs</span> {b}
          </p>
          {POSES.map(({ key, label }) => {
            const pa = byDate.get(a)?.[key];
            const pb = byDate.get(b)?.[key];
            if (!pa && !pb) return null;
            return (
              <div key={key} className="mb-3">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-faint">{label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[pa, pb].map((p, i) =>
                    p && urls?.[p.storage_path] ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img key={i} src={urls[p.storage_path]} alt="" className="aspect-[3/4] w-full rounded-xl object-cover" />
                    ) : (
                      <div key={i} className="flex aspect-[3/4] items-center justify-center rounded-xl bg-raised text-xs text-faint">
                        no photo
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Gallery by date */}
      <section className="rise rise-3 space-y-3">
        {pastDates.length > 1 && (
          <p className="text-xs text-faint">Tap two dates to compare them side by side.</p>
        )}
        {pastDates.map((d) => {
          const rows = byDate.get(d)!;
          const selected = compare.includes(d);
          return (
            <div key={d} className={`card p-3.5 ${selected ? "border-ember" : ""}`}>
              <div className="mb-2 flex items-center justify-between">
                <button
                  onClick={() => toggleCompare(d)}
                  className={`tap rounded-full px-3 py-1 text-sm font-semibold ${
                    selected ? "bg-ember text-bg" : "bg-raised text-mut"
                  }`}
                >
                  {d}
                </button>
                <span className="text-xs text-faint">{Object.keys(rows).length}/4 poses</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {POSES.map(({ key, label }) => {
                  const p = rows[key];
                  const url = p && urls?.[p.storage_path];
                  return (
                    <div key={key} className="relative aspect-[3/4] overflow-hidden rounded-lg bg-raised">
                      {url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={label} className="h-full w-full object-cover" />
                          <button
                            onClick={() => remove.mutate(p!)}
                            className="tap absolute right-0.5 top-0.5 rounded-full bg-bg/70 px-1.5 text-xs text-mut"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] uppercase text-faint">
                          {label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {pastDates.length === 0 && (
          <p className="card p-4 text-sm text-faint">
            No photos yet. Take the week-0 set today — future you needs the baseline.
          </p>
        )}
      </section>
    </div>
  );
}
