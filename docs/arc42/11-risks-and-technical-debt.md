# 11. Risks and Technical Debt

| Risk | Impact | Mitigation |
|---|---|---|
| Suggestion algorithm becomes complex | Hard to maintain and test | Keep the algorithm simple; use well-defined criteria (ingredient seasonality, recency, favorites ratio) |
| Single point of failure (one server) | Downtime affects availability | Acceptable for a personal application; regular database backups |
| No offline support | App unusable without network | Out of scope for now; could add PWA/service worker later |
