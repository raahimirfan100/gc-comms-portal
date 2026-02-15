"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPhone } from "@/lib/utils";
import { Search, Plus, Upload } from "lucide-react";
import { SkeletonTableRow } from "@/components/ui/skeleton-table";
import type { Tables } from "@/lib/supabase/types";

export default function VolunteersPage() {
  const supabase = createClient();
  const [volunteers, setVolunteers] = useState<Tables<"volunteers">[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const loadVolunteers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("volunteers")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }
    if (genderFilter !== "all") {
      query = query.eq("gender", genderFilter as "male" | "female");
    }

    const { data, count } = await query;
    if (data) setVolunteers(data);
    if (count !== null) setTotal(count);
    setLoading(false);
  }, [search, genderFilter, page]);

  useEffect(() => {
    loadVolunteers();
  }, [loadVolunteers]);

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Volunteers</h1>
          <p className="text-muted-foreground">{total} total volunteers</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Link href="/volunteers/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          </Link>
          <Link href="/volunteers/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Volunteer
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Select
          value={genderFilter}
          onValueChange={(v) => {
            setGenderFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Drives</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={7} />
                ))}
              </>
            ) : volunteers.length === 0 ? (
              <TableRow className="empty-state">
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="empty-state-icon text-4xl">📋</div>
                    <p className="text-base font-medium">No volunteers found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              volunteers.map((v) => (
                <TableRow key={v.id} className="stagger-item">
                  <TableCell>
                    <Link
                      href={`/volunteers/${v.id}`}
                      className="font-medium hover:underline"
                    >
                      {v.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatPhone(v.phone)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{v.gender}</Badge>
                  </TableCell>
                  <TableCell>{v.organization || "—"}</TableCell>
                  <TableCell>{v.total_drives_attended}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {v.source.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {v.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > pageSize && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1}-
            {Math.min((page + 1) * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(page + 1) * pageSize >= total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
