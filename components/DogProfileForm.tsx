"use client";

import { useState } from "react";
import {
  kgToLb,
  lbToKg,
  pronoun,
  type Caregivers,
  type Children,
  type DogProfile,
  type Home,
  type OtherPets,
} from "@/lib/prompt";

/**
 * The 30 most popular breeds, alphabetical so they are quick to scan.
 * "Mixed / unknown" and the free-text fallback sit at the end, since most
 * owners reach for a specific breed first.
 */
export const BREEDS = [
  "Australian cattle dog",
  "Australian shepherd",
  "Beagle",
  "Bernese mountain dog",
  "Border collie",
  "Boston terrier",
  "Boxer",
  "Bulldog",
  "Cane corso",
  "Cavalier King Charles spaniel",
  "Chihuahua",
  "Dachshund",
  "Doberman pinscher",
  "English springer spaniel",
  "French bulldog",
  "German shepherd",
  "German shorthaired pointer",
  "Golden retriever",
  "Great Dane",
  "Havanese",
  "Labrador retriever",
  "Miniature schnauzer",
  "Pembroke Welsh corgi",
  "Pomeranian",
  "Poodle",
  "Rottweiler",
  "Shiba inu",
  "Shih tzu",
  "Siberian husky",
  "Yorkshire terrier",
  "Mixed / unknown",
];
export const OTHER = "Other — type it below";

const HOMES: Array<[Home, string]> = [
  ["apartment", "Apartment"],
  ["house-yard", "House with a yard"],
  ["rural", "Rural / farm"],
];
const CAREGIVERS: Array<[Caregivers, string]> = [
  ["just-me", "Just me"],
  ["shared", "Shared with others"],
];
const CHILDREN: Array<[Children, string]> = [
  ["none", "None"],
  ["under-5", "Under 5"],
  ["5-12", "5–12"],
  ["teens", "Teens"],
];
const PETS: Array<[OtherPets, string]> = [
  ["dog", "Another dog"],
  ["cat", "A cat"],
  ["none", "None"],
];

/** Chip row. Clicking the selected chip clears it -- every field is optional. */
function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<[T, string]>;
  value: T | undefined;
  onChange: (v: T | undefined) => void;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="chips" role="group" aria-label={label}>
        {options.map(([key, text]) => (
          <button
            key={key}
            type="button"
            className={`chip${value === key ? " on" : ""}`}
            aria-pressed={value === key}
            onClick={() => onChange(value === key ? undefined : key)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DogProfileForm({
  initial,
  onSave,
  onClose,
}: {
  initial: DogProfile | null;
  onSave: (dog: DogProfile) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<DogProfile>(initial ?? { weightUnit: "lb" });

  // A breed not in the list opens the free-text box with the value already in it.
  const [breedIsOther, setBreedIsOther] = useState(
    Boolean(initial?.breed && !BREEDS.includes(initial.breed)),
  );

  const unit = form.weightUnit ?? "lb";

  // The input shows whichever unit is selected; weightLb is always the truth.
  const [weightText, setWeightText] = useState(() => {
    if (typeof initial?.weightLb !== "number") return "";
    const shown = (initial.weightUnit ?? "lb") === "kg"
      ? lbToKg(initial.weightLb)
      : initial.weightLb;
    return String(Math.round(shown * 10) / 10);
  });

  function set<K extends keyof DogProfile>(key: K, value: DogProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setWeight(text: string, nextUnit: "lb" | "kg") {
    setWeightText(text);
    const n = Number(text);
    if (text.trim() === "" || Number.isNaN(n)) {
      set("weightLb", undefined);
      return;
    }
    set("weightLb", nextUnit === "kg" ? kgToLb(n) : n);
  }

  /** Switching units converts the number rather than reinterpreting it. */
  function switchUnit(next: "lb" | "kg") {
    if (next === unit) return;
    set("weightUnit", next);
    if (typeof form.weightLb === "number") {
      const shown = next === "kg" ? lbToKg(form.weightLb) : form.weightLb;
      setWeightText(String(Math.round(shown * 10) / 10));
    }
  }

  const p = pronoun(form);
  const converted =
    typeof form.weightLb === "number"
      ? unit === "lb"
        ? `≈ ${Math.round(lbToKg(form.weightLb) * 10) / 10} kg`
        : `≈ ${Math.round(form.weightLb * 10) / 10} lb`
      : null;

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Dog profile"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{form.name?.trim() || "Your dog"}</h2>
        <p className="hint">
          All optional. The more you fill in, the more specific the answers.
          Stored on this device only.
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
            <select
              value={breedIsOther ? OTHER : form.breed ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === OTHER) {
                  setBreedIsOther(true);
                  set("breed", "");
                } else {
                  setBreedIsOther(false);
                  set("breed", v || undefined);
                }
              }}
            >
              <option value="">—</option>
              {BREEDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value={OTHER}>{OTHER}</option>
            </select>
          </label>

          {breedIsOther && (
            <input
              className="breed-other"
              value={form.breed ?? ""}
              onChange={(e) => set("breed", e.target.value)}
              placeholder="Border collie mix"
              aria-label="Breed, typed"
            />
          )}

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

            <div className="field weight-field">
              <span className="field-label">Weight</span>
              <div className="weight">
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={weightText}
                  onChange={(e) => setWeight(e.target.value, unit)}
                  aria-label={`Weight in ${unit}`}
                />
                <button
                  type="button"
                  className={`unit${unit === "lb" ? " on" : ""}`}
                  aria-pressed={unit === "lb"}
                  onClick={() => switchUnit("lb")}
                >
                  lb
                </button>
                <button
                  type="button"
                  className={`unit right${unit === "kg" ? " on" : ""}`}
                  aria-pressed={unit === "kg"}
                  onClick={() => switchUnit("kg")}
                >
                  kg
                </button>
              </div>
            </div>
          </div>

          {converted && <div className="converted">{converted}</div>}

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

          <div className="divider" />
          <div className="section-label">{p.possessive} home</div>

          <ChipGroup
            label="Where you live"
            options={HOMES}
            value={form.home}
            onChange={(v) => set("home", v)}
          />
          <ChipGroup
            label={`Who looks after ${p.object}`}
            options={CAREGIVERS}
            value={form.caregivers}
            onChange={(v) => set("caregivers", v)}
          />
          <ChipGroup
            label="Children at home"
            options={CHILDREN}
            value={form.children}
            onChange={(v) => set("children", v)}
          />
          <ChipGroup
            label="Other pets"
            options={PETS}
            value={form.otherPets}
            onChange={(v) => set("otherPets", v)}
          />

          <label>
            Anything else worth knowing
            <textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Rescue, nervous around men, grain-free diet…"
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
