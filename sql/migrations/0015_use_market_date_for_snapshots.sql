WITH "ranked_snapshots" AS (
	SELECT
		"analysis_snapshot_id",
		row_number() OVER (
			PARTITION BY
				"user_id",
				"goal_amount",
				"analysis_mode",
				CASE
					WHEN "result"->>'asOf' ~ '^\d{4}-\d{2}-\d{2}$'
						THEN ("result"->>'asOf')::date
					ELSE "saved_on"
				END
			ORDER BY "updated_at" DESC, "analysis_snapshot_id" DESC
		) AS "record_number"
	FROM "analysis_snapshots"
)
DELETE FROM "analysis_snapshots"
USING "ranked_snapshots"
WHERE "analysis_snapshots"."analysis_snapshot_id" = "ranked_snapshots"."analysis_snapshot_id"
	AND "ranked_snapshots"."record_number" > 1;--> statement-breakpoint
UPDATE "analysis_snapshots"
SET "saved_on" = ("result"->>'asOf')::date
WHERE "result"->>'asOf' ~ '^\d{4}-\d{2}-\d{2}$'
	AND "saved_on" IS DISTINCT FROM ("result"->>'asOf')::date;
