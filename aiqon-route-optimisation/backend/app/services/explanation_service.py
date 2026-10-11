"""
Explanation service — generates deterministic, data-driven explanations
for route recommendations. No external AI service required.
"""

from typing import List, Optional, Dict, Any


def _fmt_cost(v: Optional[float]) -> str:
    if v is None:
        return "N/A"
    return f"${v:,.0f}"


def _fmt_days(v: Optional[int]) -> str:
    if v is None:
        return "N/A"
    return f"{v} days"


def _fmt_pct(v: Optional[float]) -> str:
    if v is None:
        return "N/A"
    return f"{v:.0f}%"


def _fmt_risk(label: Optional[str]) -> str:
    return label or "Unknown"


def generate_recommendation_explanation(
    recommended: Optional[dict],
    eligible_routes: List[dict],
    excluded_routes: List[dict],
    score_breakdowns: List[dict],
    weights: dict,
    constraints: dict,
    preference: str,
) -> str:
    """
    Generate a human-readable explanation of why a particular route was recommended.
    All values come from actual computed scores.
    """

    # Build a lookup: route_id -> breakdown
    bd_map: Dict[str, dict] = {bd["route_id"]: bd for bd in score_breakdowns}

    lines = []

    preference_label = {
        "balanced": "Balanced",
        "lowest_cost": "Lowest Cost",
        "fastest": "Fastest",
        "lowest_risk": "Lowest Risk",
    }.get(preference, preference)

    lines.append(f"Preference: {preference_label}.")

    if not eligible_routes:
        lines.append("No eligible routes are available after applying the selected constraints.")
        if excluded_routes:
            excl_summaries = []
            for ex in excluded_routes:
                excl_summaries.append(f"• {ex['route']['route_name']}: {ex['reason']}")
            lines.append("The following routes were excluded:")
            lines.extend(excl_summaries)
        lines.append(
            "Consider relaxing one or more constraints (maximum cost, maximum transit days, "
            "or capacity filter) to make routes eligible."
        )
        return " ".join(lines) if len(lines) == 1 else "\n".join(lines)

    if recommended is None:
        lines.append("A recommendation could not be determined.")
        return "\n".join(lines)

    rec_id = recommended["id"]
    rec_bd = bd_map.get(rec_id, {})
    rec_score = rec_bd.get("total_score", "N/A")
    rec_risk_label = rec_bd.get("overall_risk_label", "Unknown")

    lines.append(
        f"{recommended['route_name']} is recommended because it achieves the highest "
        f"suitability score ({rec_score:.1f}/100) under the {preference_label} preference."
    )

    lines.append(
        f"It offers an estimated cost of {_fmt_cost(recommended.get('estimated_cost_usd'))}, "
        f"a transit time of {_fmt_days(recommended.get('estimated_transit_days'))}, "
        f"and a delay probability of {_fmt_pct(recommended.get('delay_probability_percent'))}. "
        f"Overall risk is rated {rec_risk_label}."
    )

    # Compare with alternatives
    others = [r for r in eligible_routes if r["id"] != rec_id]
    if others:
        comparisons = []
        for other in others:
            obd = bd_map.get(other["id"], {})
            other_score = obd.get("total_score", "N/A")

            reasons = []

            # Cost comparison
            rec_cost = recommended.get("estimated_cost_usd")
            oth_cost = other.get("estimated_cost_usd")
            if rec_cost is not None and oth_cost is not None:
                if oth_cost < rec_cost:
                    reasons.append(f"lower cost ({_fmt_cost(oth_cost)} vs {_fmt_cost(rec_cost)})")
                elif oth_cost > rec_cost:
                    reasons.append(f"higher cost ({_fmt_cost(oth_cost)} vs {_fmt_cost(rec_cost)})")

            # Transit comparison
            rec_days = recommended.get("estimated_transit_days")
            oth_days = other.get("estimated_transit_days")
            if rec_days is not None and oth_days is not None:
                if oth_days > rec_days:
                    reasons.append(f"longer transit ({_fmt_days(oth_days)} vs {_fmt_days(rec_days)})")
                elif oth_days < rec_days:
                    reasons.append(f"shorter transit ({_fmt_days(oth_days)} vs {_fmt_days(rec_days)})")

            # Risk comparison
            oth_risk_label = obd.get("overall_risk_label", "")
            if oth_risk_label and oth_risk_label != rec_risk_label:
                reasons.append(f"{oth_risk_label.lower()} overall risk")

            score_str = f"score {other_score:.1f}" if isinstance(other_score, float) else f"score {other_score}"
            if reasons:
                comparisons.append(
                    f"• {other['route_name']} ({score_str}): {', '.join(reasons)}."
                )
            else:
                comparisons.append(
                    f"• {other['route_name']} ({score_str}): lower overall suitability score."
                )

        lines.append("Comparison with other eligible routes:")
        lines.extend(comparisons)

    # Excluded routes
    if excluded_routes:
        lines.append("The following routes were excluded by constraints:")
        for ex in excluded_routes:
            lines.append(f"• {ex['route']['route_name']}: {ex['reason']}")

    # Constraints applied
    active_constraints = []
    if constraints.get("max_cost_usd") is not None:
        active_constraints.append(f"maximum cost ${constraints['max_cost_usd']:,.0f}")
    if constraints.get("max_transit_days") is not None:
        active_constraints.append(f"maximum transit {constraints['max_transit_days']} days")
    if constraints.get("exclude_constrained_capacity"):
        active_constraints.append("constrained/full capacity excluded")
    if active_constraints:
        lines.append(f"Active constraints: {'; '.join(active_constraints)}.")

    lines.append(
        "Note: All costs, transit times, and risk scores are synthetic and illustrative. "
        "Human review is required before any operational decision."
    )

    return "\n".join(lines)


def generate_weather_explanation(
    scenario: str,
    recommendation_changed: bool,
    new_recommended: Optional[dict],
    prev_recommended_id: Optional[str],
    score_breakdowns: List[dict],
    affected_routes: List[str],
) -> str:
    """Generate explanation for a weather reassessment result."""
    scenario_labels = {
        "normal": "Normal Conditions",
        "moderate_storm": "Moderate Storm Disruption",
        "severe_weather": "Severe Weather Disruption",
    }
    label = scenario_labels.get(scenario, scenario)
    bd_map = {bd["route_id"]: bd for bd in score_breakdowns}

    lines = [f"Weather scenario: {label} (simulated — not live weather data)."]

    if affected_routes:
        lines.append(f"Routes affected by this scenario: {len(affected_routes)} route(s) had weather risk and delay probability adjusted.")

    if recommendation_changed:
        if new_recommended:
            new_bd = bd_map.get(new_recommended["id"], {})
            new_score = new_bd.get("total_score", "N/A")
            lines.append(
                f"The recommendation has changed. {new_recommended['route_name']} "
                f"(score {new_score:.1f}/100) is now recommended because weather "
                f"disruption has increased risk on the previously preferred route."
            )
    else:
        if new_recommended:
            lines.append(
                f"The recommendation remains {new_recommended['route_name']}. "
                f"Weather changes did not sufficiently alter the relative route rankings."
            )

    lines.append(
        "Original route data is preserved. Reset conditions to restore the original scenario."
    )
    return "\n".join(lines)
