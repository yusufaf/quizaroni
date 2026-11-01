# Turns the manifest.json treosh/lighthouse-ci-action writes (one entry per run)
# into a markdown table of per-URL median scores. The assertions in
# lighthouserc.json use the median too, so the table matches pass/fail.
def median: map(select(. != null)) | sort | if length == 0 then null else .[length / 2 | floor] end;
def pct: if . == null then "n/a" else (. * 100 | round | tostring) end;
def cats: ["performance", "accessibility", "best-practices", "seo"];

"| URL | Performance | Accessibility | Best practices | SEO |",
"| --- | ---: | ---: | ---: | ---: |",
(group_by(.url)[]
  | . as $runs
  | "| \($runs[0].url | sub("^https?://[^/]+"; "")) | "
    + ([cats[] as $c | $runs | map(.summary[$c]) | median | pct] | join(" | "))
    + " |"),
"",
"Median of \(group_by(.url) | map(length) | max) runs per URL. Full HTML reports are in the `lighthouse-results` artifact."
