ALTER TABLE "profiles"
  ADD COLUMN "automatic_analysis_goal_amount" bigint,
  ADD COLUMN "automatic_analysis_monthly_contribution" bigint;

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_automatic_analysis_goal_amount_check"
    CHECK (
      "automatic_analysis_goal_amount" IS NULL OR
      "automatic_analysis_goal_amount" BETWEEN 100000000 AND 100000000000
    ),
  ADD CONSTRAINT "profiles_automatic_analysis_monthly_contribution_check"
    CHECK (
      "automatic_analysis_monthly_contribution" IS NULL OR
      "automatic_analysis_monthly_contribution" BETWEEN 0 AND 1000000000
    );
