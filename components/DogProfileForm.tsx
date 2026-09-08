"use client";

import { useState } from "react";
import type { DogProfile } from "@/lib/prompt";

export default function DogProfileForm({
  initial,
  onSave,
  onClose,
}: {
  initial: DogProfile | null;
  onSave: (dog: DogProfile) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<DogProfile>(initial ?? {});

  function set<K extends keyof DogProfile>(key: K, value: DogProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Your dog</h2>
        <p className="hint">
          Optional, but answers get a lot more specific with it. Stored on this
          device only.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
        >
          <label>
            Name
            <input
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Biscuit"
            />
          </label>

          <label>
            Breed
            <input
              value={form.breed ?? ""}
              onChange={(e) => set("breed", e.target.value)}
              placeholder="Border collie mix"
            />
          </label>

          <div className="row">
            <label>
              Age (years)
              <input
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={form.ageYears ?? ""}
                onChange={(e) =>
                  set("ageYears", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </label>

            <label>
              Weight (lb)
              <input
                type="number"
                min={1}
                max={250}
                value={form.weightLb ?? ""}
                onChange={(e) =>
                  set("weightLb", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </label>
          </div>

          <div className="row">
            <label>
              Sex
              <select
                value={form.sex ?? ""}
                onChange={(e) =>
                  set("sex", e.target.value === "" ? undefined : (e.target.value as "male" | "female"))
                }
              >
                <option value="">—</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={form.neutered ?? false}
                onChange={(e) => set("neutered", e.target.checked)}
              />
              Neutered / spayed
            </label>
          </div>

          <label>
            Anything else worth knowing
            <textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Rescue, nervous around men, on a grain-free diet…"
            />
          </label>

          <div className="actions">
            <button type="button" className="ghost" onClick={onClose}>
              Skip
            </button>
            <button type="submit" className="primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
