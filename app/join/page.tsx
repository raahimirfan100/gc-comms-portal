"use client";

import { useState, useRef, useEffect } from "react";
import posthog from "posthog-js";
import { cn, normalizePhone, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryCodePicker } from "@/components/ui/country-code-picker";
import {
  Moon,
  CheckCircle2,
  Navigation,
  Pencil,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

type Drive = {
  id: string;
  name: string;
  drive_date: string;
  location_name: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  arrival_time: string | null;
  sunset_time: string | null;
  iftaar_time: string | null;
  notes: string | null;
};

type VolunteerPrefill = {
  name: string;
  email: string | null;
  gender: "male" | "female" | null;
  organization: string | null;
};


export default function VolunteerRegisterPage() {
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [countryCode, setCountryCode] = useState("+92");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [drives, setDrives] = useState<Drive[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [organization, setOrganization] = useState("");
  const [selectedDrives, setSelectedDrives] = useState<string[]>([]);
  const [alreadySignedDriveIds, setAlreadySignedDriveIds] = useState<string[]>(
    [],
  );
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [noDrivesAvailable, setNoDrivesAvailable] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const formStartedAt = useRef<number | null>(null);

  useEffect(() => {
    formStartedAt.current = Date.now();
    posthog.capture("volunteer_form_viewed");
  }, []);

  async function handlePhoneContinue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = phoneInput.trim();
    if (!raw) return;
    setPhoneError("");
    setPhoneLoading(true);
    try {
      const normalizedPhone = normalizePhone(raw, countryCode);
      const res = await fetch(
        `/api/public/signup-context?phone=${encodeURIComponent(normalizedPhone)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");

      const driveList = data.drives ?? [];
      const signedUpDriveIds = Array.isArray(data.signedUpDriveIds)
        ? (data.signedUpDriveIds as string[])
        : [];
      const volunteerPrefill =
        data?.volunteerPrefill && typeof data.volunteerPrefill === "object"
          ? (data.volunteerPrefill as VolunteerPrefill)
          : null;
      if (driveList.length === 0) {
        posthog.capture("volunteer_no_drives_available");
        setNoDrivesAvailable(true);
        setPhoneError("");
        return;
      }
      setNoDrivesAvailable(false);
      setPhone(normalizedPhone);
      setDrives(driveList);
      setAlreadySignedDriveIds(signedUpDriveIds);
      setName(volunteerPrefill?.name?.trim() || "");
      setEmail(volunteerPrefill?.email?.trim() || "");
      setGender(
        volunteerPrefill?.gender === "male" ||
          volunteerPrefill?.gender === "female"
          ? volunteerPrefill.gender
          : "",
      );
      setOrganization(volunteerPrefill?.organization?.trim() || "");
      setSelectedDrives([]);
      setPhoneConfirmed(true);

      posthog.capture("volunteer_phone_submitted", {
        drives_available: driveList.length,
        is_returning: volunteerPrefill !== null,
      });
      if (volunteerPrefill !== null) {
        posthog.capture("volunteer_returning_detected");
      }
    } catch (err) {
      posthog.capture("volunteer_phone_failed", {
        error: err instanceof Error ? err.message : "Unknown error",
      });
      setPhoneError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setPhoneLoading(false);
    }
  }

  function handleChangePhone() {
    setPhoneConfirmed(false);
    setDrives([]);
    setSelectedDrives([]);
    setAlreadySignedDriveIds([]);
    setAgreed(false);
    setNoDrivesAvailable(false);
  }

  function toggleDrive(driveId: string) {
    setSelectedDrives((prev) => {
      const next = prev.includes(driveId)
        ? prev.filter((id) => id !== driveId)
        : [...prev, driveId];
      posthog.capture("volunteer_drives_selected", {
        drive_id: driveId,
        selected: !prev.includes(driveId),
        total_selected: next.length,
      });
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedDrives.length === 0) return;

    const timeSpent = formStartedAt.current
      ? Math.round((Date.now() - formStartedAt.current) / 1000)
      : null;
    posthog.capture("volunteer_form_submitted", {
      gender,
      organization: organization.trim() || null,
      drives_selected: selectedDrives.length,
      time_spent_seconds: timeSpent,
    });

    setLoading(true);
    setSubmitError("");

    let res: Response;
    try {
      res = await fetch("/api/public/volunteer-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name: name.trim(),
          email: email.trim() || null,
          gender: gender as "male" | "female",
          organization: organization.trim() || null,
          driveIds: selectedDrives,
        }),
      });
    } catch {
      posthog.capture("volunteer_registration_failed", {
        reason: "network_error",
      });
      setSubmitError("Could not reach the server. Please check your connection and try again.");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      posthog.capture("volunteer_registration_failed", {
        reason: "api_error",
        status: res.status,
        error: data.error || null,
      });
      setSubmitError(data.error || "Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    const data = await res.json();

    posthog.capture("volunteer_registration_success", {
      drives_selected: selectedDrives.length,
      assignments_count: data.assignments?.length ?? 0,
      time_spent_seconds: timeSpent,
    });

    posthog.identify(data.volunteerId, {
      gender,
      organization: organization.trim() || null,
      source: "in_app_form",
    });

    setLoading(false);
    setSubmitted(true);
  }

  const isFormValid =
    name.trim() &&
    email.trim() &&
    gender &&
    organization.trim() &&
    selectedDrives.length > 0 &&
    agreed;

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 page-fade-in">
        <Card className="w-full max-w-md text-center">
          <CardContent className="space-y-4 pb-8 pt-8">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
            <h2 className="text-2xl font-bold">JazakAllah Khair!</h2>
            <p className="text-muted-foreground">
              You have been registered as a volunteer.
            </p>
            <div className="mt-4 rounded-md bg-accent p-4 text-left">
              <p className="mb-2 font-medium">Next Steps</p>
              <pre className="whitespace-pre-wrap text-sm">
                Thanks for signing up! We&apos;ll send your duty details over WhatsApp soon.
              </pre>
            </div>
            <p className="text-sm text-muted-foreground">
              Reminders will be sent before each drive.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-background p-4 pt-8 md:pt-16 page-fade-in">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Moon className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Grand Citizens</CardTitle>
          <CardDescription>
            Sign up to volunteer for our Iftaar Drives in Karachi
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Phone Section */}
          {!phoneConfirmed ? (
            <>
              {noDrivesAvailable ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    No drives are available for sign-up right now. Please check
                    back later.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNoDrivesAvailable(false)}
                  >
                    Try again
                  </Button>
                </div>
              ) : (
                <>
                  {/* Instructions Block */}
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                    <p>
                      <strong>Grand Citizens</strong> is a volunteer-run
                      organization that serves Iftaar to those in need during
                      Ramadan.
                    </p>
                    <p>
                      We set up open-air Iftaar drives across Karachi where
                      volunteers help with cooking, serving, traffic management,
                      and more.
                    </p>
                    <div>
                      <p className="font-medium mb-1">Dress Code:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                        <li>Female: Shalwar Kameez</li>
                        <li>Male: NOT allowed to wear Shalwar Kameez (higher risk of pick-pocketing), shorts, or sleeveless shirts</li>
                      </ul>
                    </div>
                    <p className="font-bold">
                      NOTE: Volunteers MUST arrive by 5:00 PM.
                    </p>
                    <p className="font-medium">
                      Fill out the form below to sign up as a volunteer!
                    </p>
                    <p className="text-muted-foreground">
                      For any queries, feel free to contact us at{" "}
                      <a
                        href="https://wa.me/923342842585"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary underline underline-offset-2"
                      >
                        0334 2842585
                      </a>{" "}
                      (Muhammad Moosa Hashim)
                    </p>
                  </div>

                  <form onSubmit={handlePhoneContinue} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="flex gap-2">
                        <CountryCodePicker value={countryCode} onChange={setCountryCode} />
                        <Input
                          id="phone"
                          name="phone"
                          className="ph-no-capture"
                          placeholder="3XX XXXXXXX"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Please enter a number that is registered on WhatsApp.
                      </p>
                      {phoneError && (
                        <p className="text-sm text-destructive">{phoneError}</p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={phoneLoading}
                    >
                      {phoneLoading && <Spinner className="mr-2" />}
                      Continue
                    </Button>
                  </form>
                </>
              )}
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Locked Phone Display */}
              <div className="ph-no-capture flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Phone: </span>
                  <span className="font-medium">{countryCode} {phoneInput}</span>
                </div>
                <button
                  type="button"
                  onClick={handleChangePhone}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Pencil className="h-3 w-3" />
                  Change
                </button>
              </div>

              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Personal Details
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      className="ph-no-capture"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      className="ph-no-capture"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select value={gender} onValueChange={setGender} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organization">
                      School / Company *
                    </Label>
                    <Input
                      id="organization"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Drive Selection */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Select Drives *
                </h3>
                <div className="space-y-3">
                  {drives.map((drive) => {
                    const isAlreadySigned = alreadySignedDriveIds.includes(
                      drive.id,
                    );
                    const isSelected =
                      isAlreadySigned || selectedDrives.includes(drive.id);

                    const destination =
                      drive.location_lat != null && drive.location_lng != null
                        ? `${drive.location_lat},${drive.location_lng}`
                        : `${drive.location_name ?? ""} ${drive.location_address ?? ""}`;

                    const mapsUrl =
                      destination.trim().length > 0
                        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination.trim())}`
                        : null;

                    const staticMapUrl =
                      drive.location_lat != null &&
                      drive.location_lng != null &&
                      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                        ? `https://maps.googleapis.com/maps/api/staticmap?center=${drive.location_lat},${drive.location_lng}&zoom=15&size=300x200&scale=2&markers=color:red%7C${drive.location_lat},${drive.location_lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                        : null;

                    return (
                      <Card
                        key={drive.id}
                        className={cn(
                          "stagger-item border-2 transition-colors",
                          isAlreadySigned
                            ? "border-muted/70 bg-muted/10"
                            : isSelected
                            ? "border-primary bg-primary/5"
                            : "cursor-pointer hover:border-primary/40",
                        )}
                        onClick={() => {
                          if (!isAlreadySigned) toggleDrive(drive.id);
                        }}
                      >
                        <CardContent className="px-3 py-2 md:px-4 md:py-3">
                          <div className="flex flex-col gap-2 md:flex-row">
                            {staticMapUrl && (
                              <div className="overflow-hidden rounded-md border bg-muted/30 md:w-1/3 md:self-stretch">
                                <div className="relative h-24 w-full md:h-full md:min-h-28 group">
                                  <img
                                    src={staticMapUrl}
                                    alt={drive.location_name ?? drive.name}
                                    className="h-full w-full object-cover"
                                  />
                                  {mapsUrl && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(mapsUrl, "_blank");
                                      }}
                                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                      <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1 text-xs font-medium">
                                        <Navigation className="h-3 w-3" />
                                        Get directions
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-base font-bold">
                                    {new Date(
                                      drive.drive_date,
                                    ).toLocaleDateString("en-PK", {
                                      weekday: "long",
                                      day: "numeric",
                                      month: "long",
                                    })}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {drive.name}
                                  </p>
                                </div>
                                <div
                                  className="flex items-center gap-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    disabled={isAlreadySigned}
                                    onCheckedChange={() => {
                                      if (!isAlreadySigned) toggleDrive(drive.id);
                                    }}
                                  />
                                  <span className="text-xs font-medium">
                                    {isAlreadySigned
                                      ? "Already signed up"
                                      : "I'll attend"}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {drive.arrival_time && (
                                  <span className="rounded-full bg-muted px-2 py-0.5">
                                    Arrival Time: {formatTime(drive.arrival_time)}
                                  </span>
                                )}
                              </div>

                              {drive.location_name && (
                                <div className="space-y-1 text-sm">
                                  <div className="font-small">
                                    {drive.location_address}
                                  </div>
                                </div>
                              )}

                              {drive.notes && (
                                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                  {drive.notes}
                                </p>
                              )}

                            </div>
                          </div>
                          {isAlreadySigned && (
                            <p className="mt-2 border-t border-border/40 pt-2 text-xs text-muted-foreground">
                              You&apos;re already signed up. Need help?{" "}
                              <a
                                href="https://wa.me/923342842585"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="underline underline-offset-2 hover:text-foreground"
                              >
                                WhatsApp 0334 2842585
                              </a>{" "}
                              (Moosa).
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Agreement + Submit */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agreement"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(v === true)}
                  />
                  <Label
                    htmlFor="agreement"
                    className="cursor-pointer text-sm leading-normal"
                  >
                    I agree to volunteer for the selected iftaar drives and will
                    fulfill my assigned duties to the best of my ability.
                  </Label>
                </div>

                {submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !isFormValid}
                >
                  {loading && <Spinner />}
                  Sign Up as Volunteer
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
