"use client";

import { useState } from "react";
import { BREEDS, OTHER } from "@/components/DogProfileForm";
import { useT } from "@/lib/i18n-context";
import {
  kgToLb,
  lbToKg,
  type Caregivers,
  type Children,
  type DogProfile,
  type Home,
  type OtherPets,
} from "@/lib/prompt";

const HOME_KEYS: Home[] = ["apartment", "house-yard", "rural"];
const CARE_KEYS: Caregivers[] = ["just-me", "shared"];
const CHILD_KEYS: Children[] = ["none", "under-5", "5-12", "teens"];
const PET_KEYS: OtherPets[] = ["dog", "cat", "none"];

function Ticks({ step }: { step: 0 | 1 | 2 }) {
  return (
    <div className="ticks" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`tick${i === step ? " on" : ""}${i < step ? " done" : ""}`} />
      ))}
    </div>
  );
}

function Chips<T extends string>({
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
            className={`chip small${value === key ? " on" : ""}`}
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

/**
 * First-run onboarding, screen 2b: the same fields as the profile sheet split
 * across three panels. Shown instead of the sheet when there are no dogs yet;
 * editing later still uses the single-scroll sheet.
 */
export default function Onboarding({
  onDone,
  onSkip,
}: {
  onDone: (dog: DogProfile) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [form, setForm] = useState<DogProfile>({ weightUnit: "lb" });
  const [breedIsOther, setBreedIsOther] = useState(false);
  const [weightText, setWeightText] = useState("");

  const unit = form.weightUnit ?? "lb";
  const t = useT();

  function set<K extends keyof DogProfile>(key: K, value: DogProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setWeight(text: string) {
    setWeightText(text);
    const n = Number(text);
    set("weightLb", text.trim() === "" || Number.isNaN(n) ? undefined : unit === "kg" ? kgToLb(n) : n);
  }

  function switchUnit(next: "lb" | "kg") {
    if (next === unit) return;
    set("weightUnit", next);
    if (typeof form.weightLb === "number") {
      const shown = next === "kg" ? lbToKg(form.weightLb) : form.weightLb;
      setWeightText(String(Math.round(shown * 10) / 10));
    }
  }

  return (
    <div className="onboarding">
      {step === 0 && (
        <section className="panel intro-panel">
          <Ticks step={0} />
          <h1>{t.onbTitle}</h1>
          <p>{t.onbBody}</p>
          <div className="panel-foot">
            <button className="on-dark" onClick={() => setStep(1)}>
              {t.getStarted}
            </button>
            <button className="link-button" onClick={onSkip}>
              {t.skipForNow}
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="panel">
          <Ticks step={1} />
          <h2>{t.theDog}</h2>

          <label>
            {t.name}
            <input
              autoFocus
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Biscuit"
            />
          </label>

          <label>
            {t.breed}
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
              aria-label={t.breedTyped}
            />
          )}

          <div className="row">
            <label>
              {t.age}
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
              <span className="field-label">{t.weight}</span>
              <div className="weight">
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={weightText}
                  onChange={(e) => setWeight(e.target.value)}
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

          <div className="panel-foot row-buttons">
            <button className="ghost" onClick={() => setStep(0)}>
              {t.back}
            </button>
            <button className="primary" onClick={() => setStep(2)}>
              {t.continue}
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="panel">
          <Ticks step={2} />
          <h2>{t.theHousehold}</h2>

          <Chips
            label={t.whereYouLive}
            options={HOME_KEYS.map((k) => [k, t.homes[k]] as [Home, string])}
            value={form.home}
            onChange={(v) => set("home", v)}
          />
          <Chips
            label={t.whoLooksAfter(t.obj(form.sex))}
            options={CARE_KEYS.map((k) => [k, t.caregivers[k]] as [Caregivers, string])}
            value={form.caregivers}
            onChange={(v) => set("caregivers", v)}
          />
          <Chips
            label={t.childrenAtHome}
            options={CHILD_KEYS.map((k) => [k, t.children[k]] as [Children, string])}
            value={form.children}
            onChange={(v) => set("children", v)}
          />
          <Chips
            label={t.otherPets}
            options={PET_KEYS.map((k) => [k, t.pets[k]] as [OtherPets, string])}
            value={form.otherPets}
            onChange={(v) => set("otherPets", v)}
          />

          <div className="panel-foot">
            <p className="fine">{t.onbFine}</p>
            <div className="row-buttons">
              <button className="ghost" onClick={() => setStep(1)}>
                {t.back}
              </button>
              <button className="primary" onClick={() => onDone(form)}>
                {t.openChat}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
