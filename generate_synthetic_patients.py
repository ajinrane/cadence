import numpy as np
import pandas as pd


def generate_synthetic_patients(output_path="synthetic_patients.csv", seed=42):
    rng = np.random.default_rng(seed)
    n_patients = 200
    n_trials = 10
    today = pd.Timestamp.today().normalize()

    patient_ids = [f"PT-{i:04d}" for i in range(1, n_patients + 1)]

    # 10 unique trial IDs in NCT######## format, distributed across patients
    trial_pool = [f"NCT{12345670 + i:08d}" for i in range(n_trials)]
    trial_ids = np.repeat(trial_pool, n_patients // n_trials)
    if len(trial_ids) < n_patients:
        trial_ids = np.concatenate(
            [trial_ids, rng.choice(trial_pool, size=n_patients - len(trial_ids), replace=True)]
        )
    rng.shuffle(trial_ids)

    # Age: realistic adult trial distribution (18-75)
    age = np.where(
        rng.random(n_patients) < 0.75,
        rng.normal(51, 11, n_patients),
        rng.normal(34, 7, n_patients),
    )
    age = np.rint(np.clip(age, 18, 75)).astype(int)

    gender = rng.choice(["M", "F", "Other"], size=n_patients, p=[0.48, 0.49, 0.03])

    # Distance skewed toward closer sites
    distance_from_site_miles = np.round(1 + rng.beta(1.7, 5.2, n_patients) * 99, 1)

    # Transportation issues correlate with distance
    p_transport = np.clip(
        0.04 + 0.006 * distance_from_site_miles + 0.04 * (distance_from_site_miles > 50),
        0.03,
        0.85,
    )
    has_transportation_issues = rng.random(n_patients) < p_transport

    # Caregiver support tends to increase with age, decreases with transportation issues
    p_caregiver = np.clip(
        0.18 + 0.006 * np.maximum(age - 45, 0) - 0.10 * has_transportation_issues,
        0.05,
        0.90,
    )
    has_caregiver_support = rng.random(n_patients) < p_caregiver

    # Comorbidity count increases with age
    comorbidity_lambda = np.clip(0.35 + (age - 18) / 30, 0.1, 3.5)
    comorbidity_count = np.clip(rng.poisson(comorbidity_lambda), 0, 4).astype(int)

    # Older + more comorbidity => higher prior trial participation probability
    p_previous_trial = np.clip(
        0.10 + 0.0045 * (age - 25) + 0.04 * (comorbidity_count >= 2),
        0.05,
        0.80,
    )
    previous_trial_participation = rng.random(n_patients) < p_previous_trial

    # Enrollment date across past 6 months
    days_ago = rng.integers(0, 181, n_patients)
    enrollment_date = today - pd.to_timedelta(days_ago, unit="D")

    scheduled_visits = rng.integers(8, 25, n_patients)

    # Missed visits correlate with distance, transport issues, and comorbidity
    missed_lambda = np.clip(
        0.35
        + 0.011 * distance_from_site_miles
        + 0.30 * has_transportation_issues
        + 0.16 * comorbidity_count
        - 0.14 * has_caregiver_support,
        0.1,
        4.5,
    )
    missed_visits = np.clip(rng.poisson(missed_lambda), 0, 5).astype(int)

    # Contact recency correlates with missed visits and transportation barriers
    days_since_last_contact = np.clip(
        rng.gamma(shape=2.1, scale=7.5, size=n_patients)
        + missed_visits * 5
        + has_transportation_issues * 7
        - has_caregiver_support * 3,
        0,
        90,
    ).astype(int)

    # Contact preference with age + distance effects
    methods = ["phone", "email", "text", "in-person"]
    contact_method_preference = []
    for a, d in zip(age, distance_from_site_miles):
        if a >= 60:
            probs = np.array([0.55, 0.22, 0.13, 0.10], dtype=float)
        elif a <= 30:
            probs = np.array([0.22, 0.24, 0.49, 0.05], dtype=float)
        else:
            probs = np.array([0.36, 0.31, 0.24, 0.09], dtype=float)

        if d > 40:
            probs = probs + np.array([0.04, 0.03, 0.02, -0.09], dtype=float)
            probs = np.clip(probs, 0.01, None)

        probs = probs / probs.sum()
        contact_method_preference.append(rng.choice(methods, p=probs))

    # Risk score used to enforce status distribution + correlations
    risk_score = (
        0.30 * (missed_visits / 5)
        + 0.18 * (distance_from_site_miles / 100)
        + 0.17 * has_transportation_issues.astype(float)
        + 0.14 * (comorbidity_count / 4)
        + 0.10 * np.clip((age - 55) / 20, 0, 1)
        + 0.12 * (days_since_last_contact / 90)
        - 0.10 * has_caregiver_support.astype(float)
        - 0.05 * previous_trial_participation.astype(float)
        + rng.normal(0, 0.04, n_patients)
    )
    risk_score = np.clip(risk_score, 0, 1)

    # Exact status mix: 15% dropped_out, 25% at_risk, 60% active
    order = np.argsort(risk_score)[::-1]
    status = np.array(["active"] * n_patients, dtype=object)
    n_dropped = int(0.15 * n_patients)  # 30
    n_at_risk = int(0.25 * n_patients)  # 50
    status[order[:n_dropped]] = "dropped_out"
    status[order[n_dropped : n_dropped + n_at_risk]] = "at_risk"

    is_active = status == "active"
    is_at_risk = status == "at_risk"
    is_dropped = status == "dropped_out"

    # Reinforce behavioral realism by status
    missed_visits[is_active] = np.clip(
        missed_visits[is_active] - rng.integers(0, 2, is_active.sum()), 0, 5
    )
    missed_visits[is_at_risk] = np.clip(
        missed_visits[is_at_risk] + rng.integers(0, 2, is_at_risk.sum()), 0, 5
    )
    missed_visits[is_dropped] = np.clip(
        missed_visits[is_dropped] + rng.integers(1, 3, is_dropped.sum()), 0, 5
    )

    days_since_last_contact[is_active] = np.clip(
        days_since_last_contact[is_active] - rng.integers(0, 20, is_active.sum()), 0, 90
    )
    days_since_last_contact[is_at_risk] = np.clip(
        days_since_last_contact[is_at_risk] + rng.integers(5, 20, is_at_risk.sum()), 0, 90
    )
    days_since_last_contact[is_dropped] = np.clip(
        days_since_last_contact[is_dropped] + rng.integers(20, 35, is_dropped.sum()), 0, 90
    )

    # Completed visits depend on enrollment time + adherence + status
    days_enrolled = (today - enrollment_date).days.to_numpy()
    progress = np.clip(days_enrolled / 180, 0.05, 1.0)

    completed_visits = np.floor(
        scheduled_visits * progress - missed_visits * 0.8 + rng.normal(0, 1.3, n_patients)
    ).astype(int)

    completed_visits[is_active] += rng.integers(1, 4, is_active.sum())
    completed_visits[is_at_risk] += rng.integers(-1, 2, is_at_risk.sum())
    completed_visits[is_dropped] -= rng.integers(1, 4, is_dropped.sum())

    completed_visits = np.clip(completed_visits, 0, scheduled_visits)
    completed_visits[is_dropped] = np.minimum(
        completed_visits[is_dropped],
        np.floor(scheduled_visits[is_dropped] * 0.75).astype(int),
    )
    completed_visits[is_active] = np.maximum(
        completed_visits[is_active],
        np.floor(scheduled_visits[is_active] * 0.40).astype(int),
    )
    completed_visits = np.clip(completed_visits, 0, scheduled_visits)

    df = pd.DataFrame(
        {
            "patient_id": patient_ids,
            "trial_id": trial_ids,
            "age": age,
            "gender": gender,
            "distance_from_site_miles": distance_from_site_miles,
            "enrollment_date": enrollment_date.strftime("%Y-%m-%d"),
            "scheduled_visits": scheduled_visits,
            "completed_visits": completed_visits,
            "missed_visits": missed_visits,
            "days_since_last_contact": days_since_last_contact,
            "contact_method_preference": contact_method_preference,
            "has_transportation_issues": has_transportation_issues,
            "has_caregiver_support": has_caregiver_support,
            "comorbidity_count": comorbidity_count,
            "previous_trial_participation": previous_trial_participation,
            "status": status,
        }
    )

    # Sanity checks
    assert len(df) == 200
    assert df["trial_id"].nunique() == 10
    assert (df["status"] == "dropped_out").sum() == 30
    assert (df["status"] == "at_risk").sum() == 50
    assert (df["status"] == "active").sum() == 120

    df.to_csv(output_path, index=False)
    print(f"Saved {output_path} with {len(df)} rows.")
    print(df["status"].value_counts())


if __name__ == "__main__":
    generate_synthetic_patients()
