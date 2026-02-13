"""
Site repository — organizations, sites, trials, enrollments.
"""

from .base import BaseRepository


class SiteRepository(BaseRepository):

    # ── Organizations ────────────────────────────────────────────
    async def list_organizations(self) -> list[dict]:
        return await self._fetch("SELECT * FROM organizations ORDER BY name")

    async def create_organization(self, org_id: str, name: str, org_type: str = "clinical_site") -> dict:
        return await self._fetchrow(
            "INSERT INTO organizations (organization_id, name, type) VALUES ($1, $2, $3) RETURNING *",
            org_id, name, org_type,
        )

    # ── Sites ────────────────────────────────────────────────────
    async def list_sites(self) -> list[dict]:
        return await self._fetch("SELECT * FROM sites ORDER BY name")

    async def get_site(self, site_id: str) -> dict | None:
        return await self._fetchrow("SELECT * FROM sites WHERE site_id = $1", site_id)

    async def create_site(self, data: dict) -> dict:
        return await self._fetchrow(
            """INSERT INTO sites (site_id, organization_id, name, location, pi_name, crc_count)
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING *""",
            data["site_id"], data["organization_id"], data["name"],
            data["location"], data["pi_name"], data.get("crc_count", 0),
        )

    async def update_site(self, site_id: str, updates: dict) -> dict | None:
        fields = []
        args = []
        i = 1
        for key in ("name", "location", "pi_name", "crc_count"):
            if key in updates and updates[key] is not None:
                fields.append(f"{key} = ${i}")
                args.append(updates[key])
                i += 1
        if not fields:
            return await self.get_site(site_id)
        args.append(site_id)
        return await self._fetchrow(
            f"UPDATE sites SET {', '.join(fields)} WHERE site_id = ${i} RETURNING *",
            *args,
        )

    # ── Trials ───────────────────────────────────────────────────
    async def list_trials(self) -> list[dict]:
        return await self._fetch("SELECT * FROM trials ORDER BY name")

    async def get_trial(self, trial_id: str) -> dict | None:
        return await self._fetchrow("SELECT * FROM trials WHERE trial_id = $1", trial_id)

    async def create_trial(self, data: dict) -> dict:
        return await self._fetchrow(
            """INSERT INTO trials (trial_id, name, phase, condition, sponsor, expected_duration_weeks, visit_schedule)
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *""",
            data["trial_id"], data["name"], data["phase"], data["condition"],
            data["sponsor"], data.get("expected_duration_weeks", 52),
            data.get("visit_schedule", ""),
        )

    async def get_trials_for_site(self, site_id: str) -> list[dict]:
        return await self._fetch(
            """SELECT t.*, ste.enrolled, ste.pi
               FROM trials t
               JOIN site_trial_enrollments ste ON t.trial_id = ste.trial_id
               WHERE ste.site_id = $1
               ORDER BY t.name""",
            site_id,
        )

    # ── Enrollments ──────────────────────────────────────────────
    async def list_enrollments(self) -> list[dict]:
        return await self._fetch("SELECT * FROM site_trial_enrollments")

    async def enroll_site_trial(self, site_id: str, trial_id: str, enrolled: int = 0, pi: str = "") -> dict:
        return await self._fetchrow(
            """INSERT INTO site_trial_enrollments (site_id, trial_id, enrolled, pi)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (site_id, trial_id) DO UPDATE SET enrolled = $3, pi = $4
               RETURNING *""",
            site_id, trial_id, enrolled, pi,
        )

    async def unenroll_site_trial(self, site_id: str, trial_id: str) -> bool:
        result = await self._execute(
            "DELETE FROM site_trial_enrollments WHERE site_id = $1 AND trial_id = $2",
            site_id, trial_id,
        )
        return result == "DELETE 1"
