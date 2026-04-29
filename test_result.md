#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Multi-tenant CRM + Call Center + QA + Commission management for SA insurance ops.
  MVP scope (user-confirmed: 1a + 2a + 3a + 4a + 5b):
  - Stack: Next.js + MongoDB (env constraint)
  - Auth: email/password + JWT, seeded demo users for 4 roles
  - Lead Lifecycle Core + RBAC (super, agent, field, qa)
  - SA ID validation (Luhn checksum)
  - Disposition system (10 statuses) with QA auto-trigger
  - Callbacks (global visibility; super-only assignment)
  - Append-only audit log
  - Role-based dashboard
  - WhatsApp/recordings deferred

backend:
  - task: "Health, Auth seed, Login, JWT verify"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "Manually verified: /api/health, /api/auth/seed (creates 4 demo users), /api/auth/login returns JWT token. /api/auth/me works."
        -working: true
        -agent: "testing"
        -comment: "Comprehensive testing completed: ✅ Health check (200), ✅ Auth seed (idempotent), ✅ Login for all 4 roles (admin, agent, field, qa), ✅ JWT verification via /api/auth/me for all roles. All authentication flows working correctly."

  - task: "SA ID validation (Luhn)"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "POST /api/validate/sa-id correctly rejects invalid checksum and accepts 8001015009087 (gender=M, SA Citizen). Lead creation enforces this."
        -working: true
        -agent: "testing"
        -comment: "Comprehensive testing completed: ✅ Valid SA ID (8001015009087) returns valid=true, gender=M, citizenship='SA Citizen', ✅ Invalid checksum (9001015009087) returns valid=false, ✅ Invalid format (12345) returns valid=false. All validation working correctly."

  - task: "Lead CRUD with role scoping"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "POST /api/leads, GET /api/leads with q/disposition/source filters, GET/PATCH /api/leads/:id. Agents/field see only their own; super/qa see all."
        -working: true
        -agent: "testing"
        -comment: "Comprehensive testing completed: ✅ Lead creation with valid SA ID, ✅ Validation (missing phone returns 400, invalid SA ID returns 400), ✅ Lead retrieval with search filters (q=Mokoena, disposition=New), ✅ Role scoping (agent sees only assigned leads, admin sees all), ✅ Lead assignment by admin, ✅ PATCH operations. All CRUD and scoping working correctly."

  - task: "Dispositions, QA auto-trigger, Callbacks"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Setting disposition Voicemail/No Answer/Sale auto-sets qaStatus=Pending. POST /api/leads/:id/callback creates callback. POST /api/callbacks/:id/assign restricted to super."
        -working: true
        -agent: "testing"
        -comment: "Comprehensive testing completed: ✅ Disposition update to 'Voicemail' auto-triggers qaStatus='Pending', ✅ Callback scheduling changes lead disposition to 'Callback Scheduled', ✅ Callback retrieval via GET /api/callbacks, ✅ Agent disposition update to 'Sale' maintains qaStatus='Pending'. All disposition and callback flows working correctly."

  - task: "Append-only audit log + comments"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Every mutation writes to audit_logs collection. GET /api/leads/:id/audit and GET /api/audit (super only). Comments are pushed (append-only) onto lead.comments."
        -working: true
        -agent: "testing"
        -comment: "Comprehensive testing completed: ✅ Comment addition via POST /api/leads/:id/comments, ✅ Lead-specific audit history via GET /api/leads/:id/audit (6 entries found), ✅ Global audit log via GET /api/audit (super only, agent gets 403), ✅ All expected audit actions found: LEAD_CREATED, LEAD_UPDATED, COMMENT_ADDED, CALLBACK_SCHEDULED, LEAD_ASSIGNED, QA_UPDATED. All audit and comment functionality working correctly."

  - task: "QA queue + role-aware dashboard"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "GET /api/qa/queue (qa+super), PATCH /api/qa/:leadId. /api/dashboard returns counts scoped by role."
        -working: true
        -agent: "testing"
        -comment: "Comprehensive testing completed: ✅ QA queue access (qa role can access, agent gets 403), ✅ QA status update via PATCH /api/qa/:leadId, ✅ Admin dashboard with all counts (total, sales, callbacks, qaPending, conversionRate), ✅ Agent dashboard properly scoped (agent=1 lead, admin=2 leads), ✅ Users list retrieval (4 users found). All QA and dashboard functionality working correctly."

frontend:
  - task: "Login + role-based UI shell"
    implemented: true
    working: "NA"
    file: "/app/app/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Not yet tested via automation. Awaiting user permission."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Health, Auth seed, Login, JWT verify"
    - "SA ID validation (Luhn)"
    - "Lead CRUD with role scoping"
    - "Dispositions, QA auto-trigger, Callbacks"
    - "Append-only audit log + comments"
    - "QA queue + role-aware dashboard"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: |
      MVP backend complete. Please test the full flow against /api endpoints:
      1. POST /api/auth/seed (idempotent) -> creates 4 demo users
      2. POST /api/auth/login with each role's credentials (admin@sentinel.co.za/admin123, agent@sentinel.co.za/agent123, field@sentinel.co.za/field123, qa@sentinel.co.za/qa123)
      3. SA ID validation: 8001015009087 should be valid; 9001015009087 should be invalid checksum
      4. As admin: create a lead with valid SA ID + vehicle/product fields
      5. As admin: PATCH disposition to "Voicemail" -> verify qaStatus auto-set to "Pending"
      6. As admin: schedule a callback via /api/leads/:id/callback -> verify lead disposition becomes "Callback Scheduled"
      7. As qa user: GET /api/qa/queue -> should include the Voicemail lead
      8. As qa user: PATCH /api/qa/:leadId with qaStatus=Completed and feedback
      9. As agent user: GET /api/leads should be scoped (return only assignee=self)
      10. As admin: POST /api/leads/:id/assign to assign to agent; verify agent now sees it
      11. GET /api/leads/:id/audit -> verify multiple immutable entries
      12. GET /api/audit (super only) -> 403 for agent, 200 for super
      13. GET /api/dashboard -> returns counts; agent gets only their own
      Report any 4xx/5xx that aren't expected.
    -agent: "testing"
    -message: |
      ✅ COMPREHENSIVE BACKEND TESTING COMPLETED - ALL TESTS PASSED (17/17)
      
      Executed complete end-to-end testing scenario covering all 25 test points from review request:
      
      🔐 Authentication & Authorization:
      - Health check, auth seed, login for all 4 roles, JWT verification
      - Role-based access control (agent QA queue access properly forbidden)
      
      🆔 SA ID Validation:
      - Valid SA ID (8001015009087): gender=M, citizenship='SA Citizen'
      - Invalid checksum (9001015009087): correctly rejected
      - Invalid format (12345): correctly rejected
      
      📋 Lead Management:
      - Lead creation with validation (missing phone/invalid SA ID properly rejected)
      - Lead retrieval with search/filter functionality
      - Role scoping (agents see only assigned leads, admin sees all)
      - Lead assignment by admin
      
      🔄 Disposition & QA Workflow:
      - Disposition updates with QA auto-trigger (Voicemail → qaStatus=Pending)
      - Agent disposition updates (Sale → qaStatus=Pending maintained)
      - QA queue access and status updates
      
      📞 Callbacks:
      - Callback scheduling (disposition changes to 'Callback Scheduled')
      - Callback retrieval (global visibility)
      
      📝 Audit & Comments:
      - Comment addition (append-only)
      - Lead-specific audit history (6 entries found)
      - Global audit log (super-only access, all expected actions present)
      
      📊 Dashboard:
      - Admin dashboard (total=2, sales=1, conversion=50%)
      - Agent dashboard properly scoped (agent=1, admin=2)
      
      All endpoints responding correctly with expected status codes, proper role-based access control, and accurate data validation. No critical issues found.
