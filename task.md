# Implementation Tasks

- `[x]` 1. **Data Models**
  - `[x]` Create `Exam.js` schema (questions, answers, timeLimit).
  - `[x]` Create `AssessmentSession.js` schema for cheat tracking.
  - `[x]` Update `Application.js` schema (`matchScore`, `assessmentSessionId`).
- `[ ]` 2. **Controllers**
  - `[ ]` Create `assessmentController.js` logic (start exam, timed submit, grading).
  - `[ ]` Update `applicationController.js` (dynamic match score calculation using skills/experience/exam score).
  - `[ ]` Ensure applications are ranked by `matchScore` descending on GET endpoints.
- `[ ]` 3. **Middlewares**
  - `[ ]` Create `subscriptionMiddleware.js` (`requireSubscription`).
  - `[ ]` Apply `requireSubscription` to application creation routes.
- `[ ]` 4. **Routes**
  - `[ ]` Create and mount `assessmentRoutes.js` in Express.
  - `[ ]` Update `jobRoutes.js` / `applicationRoutes.js`.
