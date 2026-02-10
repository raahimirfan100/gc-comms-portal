"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/utils";
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
import { Moon, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

type Drive = {
  id: string;
  name: string;
  drive_date: string;
  location_name: string | null;
};

type VolunteerPrefill = {
  name: string;
  email: string | null;
  gender: string;
  organization: string | null;
};

type Step = 1 | 2 | 3;

export default function VolunteerRegisterPage() {
  const supabase = createClient();
  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState("");
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

  async function handlePhoneContinue(e: React.FormEvent) {
    e.preventDefault();
    const raw = (e.currentTarget.elements.namedItem("phone") as HTMLInputElement)?.value?.trim();
    if (!raw) return;
    setPhoneError("");
    setPhoneLoading(true);
    try {
      const res = await fetch(
        `/api/public/signup-context?phone=${encodeURIComponent(raw)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
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
      setStep(2);
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPhoneLoading(false);
    }
  }

  function handleDetailsNext() {
    if (!name.trim() || !gender) return;
    setStep(3);
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

    const { data: volunteerRow, error: volError } = await supabase
      .from("volunteers")
      .upsert(
        {
          phone,
          name: name.trim(),
          email: email.trim() || null,
          gender: gender as "male" | "female",
          organization: organization.trim() || null,
          source: "in_app_form" as const,
        },
        { onConflict: "phone" },
      )
      .select()
      .single();

    if (volError || !volunteerRow) {
      setLoading(false);
      return;
    }

    for (const driveId of selectedDrives) {
      await supabase
        .from("volunteer_availability")
        .upsert(
          {
            volunteer_id: volunteerRow.id,
            drive_id: driveId,
            source: "in_app_form" as const,
          },
          { onConflict: "volunteer_id,drive_id" },
        );
    }

    const res = await fetch("/api/public/auto-assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        volunteerId: volunteerRow.id,
        driveIds: selectedDrives,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.assignments?.length > 0) {
        setAssignmentInfo(
          data.assignments
            .map((a: { drive: string; duty: string }) => `${a.drive}: ${a.duty}`)
            .join("\n"),
        );
      }
    }

    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
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
        <CardContent>
          {step === 1 && (
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
                      required
                      autoFocus
                    />
                    <p className="text-sm text-muted-foreground">
                      Use the same number you&apos;ve used before if you&apos;ve
                      signed up before, so we can load your details.
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
          )}

          {step === 2 && (
            <div className="space-y-4">
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  School / College / University / Company
                </Label>
                <Input
                  id="organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleDetailsNext}
                  disabled={!name.trim() || !gender}
                  className="flex-1"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {drives.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No drives are available for sign-up right now. Please check
                    back later.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label>Available dates *</Label>
                    <div className="space-y-2">
                      {drives.map((drive) => (
                        <label
                          key={drive.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent"
                        >
                          <Checkbox
                            checked={selectedDrives.includes(drive.id)}
                            onCheckedChange={() => toggleDrive(drive.id)}
                          />
                          <div>
                            <div className="font-medium">{drive.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(drive.drive_date).toLocaleDateString(
                                "en-PK",
                                {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "long",
                                },
                              )}
                              {drive.location_name &&
                                ` — ${drive.location_name}`}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-2">
                    <Checkbox
                      id="agreement"
                      checked={agreed}
                      onCheckedChange={(v) => setAgreed(v === true)}
                    />
                    <Label
                      htmlFor="agreement"
                      className="cursor-pointer text-sm leading-normal"
                    >
                      I agree to volunteer for the selected iftaar drives and
                      will fulfill my assigned duties to the best of my ability.
                    </Label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={
                        loading ||
                        selectedDrives.length === 0 ||
                        !agreed
                      }
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Sign Up as Volunteer
                    </Button>
                  </div>
                </>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
