"use client";

import { useEffect, useState } from "react";
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
import {
  Moon,
  Loader2,
  CheckCircle2,
  Navigation,
  Pencil,
} from "lucide-react";

type Drive = {
  id: string;
  name: string;
  drive_date: string;
  location_name: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  sunset_time: string | null;
  iftaar_time: string | null;
  notes: string | null;
};

type VolunteerPrefill = {
  name: string;
  email: string | null;
  gender: string;
  organization: string | null;
};

export default function VolunteerRegisterPage() {
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [drives, setDrives] = useState<Drive[]>([]);
  const [volunteer, setVolunteer] = useState<VolunteerPrefill | null>(null);
  const [existingDriveIds, setExistingDriveIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [organization, setOrganization] = useState("");
  const [selectedDrives, setSelectedDrives] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [assignmentInfo, setAssignmentInfo] = useState("");
  const [noDrivesAvailable, setNoDrivesAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("gc_volunteer_phone");
    if (saved) setPhoneInput(saved);
  }, []);

  async function handlePhoneContinue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = phoneInput.trim();
    if (!raw) return;
    setPhoneError("");
    setPhoneLoading(true);
    try {
      const res = await fetch(
        `/api/public/signup-context?phone=${encodeURIComponent(raw)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");

      if (typeof window !== "undefined") {
        window.localStorage.setItem("gc_volunteer_phone", raw);
      }
      const driveList = data.drives ?? [];
      if (driveList.length === 0) {
        setNoDrivesAvailable(true);
        setPhoneError("");
        return;
      }
      setNoDrivesAvailable(false);
      setPhone(normalizePhone(raw));
      setDrives(driveList);
      setVolunteer(data.volunteer ?? null);
      setExistingDriveIds(data.existingDriveIds ?? []);
      if (data.volunteer) {
        setName(data.volunteer.name);
        setEmail(data.volunteer.email ?? "");
        setGender(data.volunteer.gender);
        setOrganization(data.volunteer.organization ?? "");
      } else {
        setName("");
        setEmail("");
        setGender("");
        setOrganization("");
      }
      setSelectedDrives(data.existingDriveIds ?? []);
      setPhoneConfirmed(true);
    } catch (err) {
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
    setVolunteer(null);
    setExistingDriveIds([]);
    setSelectedDrives([]);
    setAgreed(false);
    setNoDrivesAvailable(false);
  }

  function toggleDrive(driveId: string) {
    setSelectedDrives((prev) =>
      prev.includes(driveId)
        ? prev.filter((id) => id !== driveId)
        : [...prev, driveId],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedDrives.length === 0) return;
    setLoading(true);

    const res = await fetch("/api/public/volunteer-register", {
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

    if (!res.ok) {
      setLoading(false);
      return;
    }

    const data = await res.json();

    if (data.assignments?.length > 0) {
      setAssignmentInfo(
        data.assignments
          .map((a: { drive: string; duty: string }) => `${a.drive}: ${a.duty}`)
          .join("\n"),
      );
    }

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
            {assignmentInfo && (
              <div className="mt-4 rounded-md bg-accent p-4 text-left">
                <p className="mb-2 font-medium">Your Duty Assignments:</p>
                <pre className="whitespace-pre-wrap text-sm">
                  {assignmentInfo}
                </pre>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              You will receive WhatsApp reminders before each drive.
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
                <form onSubmit={handlePhoneContinue} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="03XX-XXXXXXX"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      required
                      autoFocus
                    />
                    <p className="text-sm text-muted-foreground">
                      Use the same number you&apos;ve used before if
                      you&apos;ve signed up before, so we can load your
                      details.
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
                    {phoneLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Continue
                  </Button>
                </form>
              )}
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Locked Phone Display */}
              <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Phone: </span>
                  <span className="font-medium">{phoneInput}</span>
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
                    const isSelected = selectedDrives.includes(drive.id);
                    const isExisting = existingDriveIds.includes(drive.id);

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
                          "stagger-item cursor-pointer border-2 transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/40",
                        )}
                        onClick={() => {
                          if (!isExisting) toggleDrive(drive.id);
                        }}
                      >
                        <CardContent className="px-3 py-2 md:px-4 md:py-3">
                          <div className="flex flex-col gap-2 md:flex-row">
                            {staticMapUrl && (
                              <div className="overflow-hidden rounded-md border bg-muted/30 md:w-1/3">
                                <div className="relative h-24 w-full md:h-28 group">
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
                                  <div className="text-sm font-semibold">
                                    {drive.name}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(
                                      drive.drive_date,
                                    ).toLocaleDateString("en-PK", {
                                      weekday: "long",
                                      day: "numeric",
                                      month: "long",
                                    })}
                                  </p>
                                </div>
                                <div
                                  className="flex items-center gap-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    disabled={isExisting}
                                    onCheckedChange={() => {
                                      if (!isExisting) toggleDrive(drive.id);
                                    }}
                                  />
                                  <span className="text-xs font-medium">
                                    I&apos;ll attend
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {drive.sunset_time && (
                                  <span className="rounded-full bg-muted px-2 py-0.5">
                                    Sunset: {formatTime(drive.sunset_time)}
                                  </span>
                                )}
                                {drive.iftaar_time && (
                                  <span className="rounded-full bg-muted px-2 py-0.5">
                                    Iftaar: {formatTime(drive.iftaar_time)}
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !isFormValid}
                >
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
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
