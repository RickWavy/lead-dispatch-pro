#!/usr/bin/env python3
"""
Comprehensive backend API test for Sentinel CRM
Tests all endpoints according to the review request specification
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://lead-dispatch-pro.preview.emergentagent.com/api"
TIMEOUT = 30

# Test data
DEMO_USERS = {
    "admin": {"email": "admin@sentinel.co.za", "password": "admin123", "role": "super"},
    "agent": {"email": "agent@sentinel.co.za", "password": "agent123", "role": "agent"},
    "field": {"email": "field@sentinel.co.za", "password": "field123", "role": "field"},
    "qa": {"email": "qa@sentinel.co.za", "password": "qa123", "role": "qa"}
}

# Global variables to store tokens and test data
tokens = {}
test_lead_id = None
test_callback_id = None
agent_user_id = None

def log_test(step, description):
    """Log test step"""
    print(f"\n{'='*60}")
    print(f"STEP {step}: {description}")
    print('='*60)

def log_result(success, message, response=None):
    """Log test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if response and not success:
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")

def make_request(method, endpoint, data=None, headers=None, expected_status=200):
    """Make HTTP request with error handling"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers, timeout=TIMEOUT)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=TIMEOUT)
        elif method.upper() == 'PATCH':
            response = requests.patch(url, json=data, headers=headers, timeout=TIMEOUT)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        success = response.status_code == expected_status
        if success:
            try:
                return True, response.json()
            except:
                return True, response.text
        else:
            return False, response
    except Exception as e:
        print(f"Request failed: {str(e)}")
        return False, None

def get_auth_headers(role):
    """Get authorization headers for a role"""
    if role not in tokens:
        return None
    return {"Authorization": f"Bearer {tokens[role]}"}

def test_health():
    """Test 1: Health check"""
    log_test(1, "Health Check")
    success, result = make_request('GET', '/health')
    if success and isinstance(result, dict) and result.get('ok'):
        log_result(True, "Health endpoint working")
        return True
    else:
        log_result(False, "Health endpoint failed", result if not success else None)
        return False

def test_auth_seed():
    """Test 2: Auth seed"""
    log_test(2, "Auth Seed")
    success, result = make_request('POST', '/auth/seed')
    if success and isinstance(result, dict) and result.get('ok'):
        log_result(True, "Auth seed successful")
        return True
    else:
        log_result(False, "Auth seed failed", result if not success else None)
        return False

def test_auth_login():
    """Test 3: Login for all roles"""
    log_test(3, "Login for All Roles")
    all_success = True
    
    for role, creds in DEMO_USERS.items():
        success, result = make_request('POST', '/auth/login', {
            "email": creds["email"],
            "password": creds["password"]
        })
        
        if success and isinstance(result, dict) and result.get('token'):
            tokens[role] = result['token']
            log_result(True, f"Login successful for {role}")
            
            # Store agent user ID for later assignment test
            if role == "agent":
                global agent_user_id
                agent_user_id = result['user']['id']
        else:
            log_result(False, f"Login failed for {role}", result if not success else None)
            all_success = False
    
    return all_success

def test_auth_me():
    """Test 4: Auth me for all roles"""
    log_test(4, "Auth Me for All Roles")
    all_success = True
    
    for role in DEMO_USERS.keys():
        headers = get_auth_headers(role)
        if not headers:
            log_result(False, f"No token for {role}")
            all_success = False
            continue
            
        success, result = make_request('GET', '/auth/me', headers=headers)
        
        if success and isinstance(result, dict) and result.get('user', {}).get('role') == DEMO_USERS[role]['role']:
            log_result(True, f"Auth me successful for {role}")
        else:
            log_result(False, f"Auth me failed for {role}", result if not success else None)
            all_success = False
    
    return all_success

def test_sa_id_validation():
    """Test 5: SA ID validation"""
    log_test(5, "SA ID Validation")
    all_success = True
    
    # Test valid SA ID
    success, result = make_request('POST', '/validate/sa-id', {"id": "8001015009087"})
    if success and isinstance(result, dict) and result.get('valid') and result.get('gender') == 'M' and result.get('citizenship') == 'SA Citizen':
        log_result(True, "Valid SA ID test passed")
    else:
        log_result(False, "Valid SA ID test failed", result if not success else None)
        all_success = False
    
    # Test invalid checksum
    success, result = make_request('POST', '/validate/sa-id', {"id": "9001015009087"})
    if success and isinstance(result, dict) and not result.get('valid'):
        log_result(True, "Invalid checksum test passed")
    else:
        log_result(False, "Invalid checksum test failed", result if not success else None)
        all_success = False
    
    # Test invalid format
    success, result = make_request('POST', '/validate/sa-id', {"id": "12345"})
    if success and isinstance(result, dict) and not result.get('valid'):
        log_result(True, "Invalid format test passed")
    else:
        log_result(False, "Invalid format test failed", result if not success else None)
        all_success = False
    
    return all_success

def test_lead_creation():
    """Test 6: Lead creation as admin"""
    log_test(6, "Lead Creation")
    global test_lead_id
    
    headers = get_auth_headers('admin')
    lead_data = {
        "firstName": "Thabo",
        "lastName": "Mokoena", 
        "phone": "+27123456789",
        "saId": "8001015009087",
        "vehicleMake": "Toyota",
        "vehicleModel": "Corolla",
        "vehicleYear": 2020,
        "source": "Outbound"
    }
    
    success, result = make_request('POST', '/leads', lead_data, headers=headers)
    if success and isinstance(result, dict) and result.get('lead', {}).get('id'):
        test_lead_id = result['lead']['id']
        disposition = result['lead'].get('disposition')
        if disposition == 'New':
            log_result(True, f"Lead created successfully with ID: {test_lead_id}")
            return True
        else:
            log_result(False, f"Lead created but wrong disposition: {disposition}")
            return False
    else:
        log_result(False, "Lead creation failed", result if not success else None)
        return False

def test_lead_validation():
    """Test 7-8: Lead validation"""
    log_test(7, "Lead Validation Tests")
    headers = get_auth_headers('admin')
    all_success = True
    
    # Test missing phone
    success, result = make_request('POST', '/leads', {
        "firstName": "Test",
        "lastName": "User"
    }, headers=headers, expected_status=400)
    
    if success:
        log_result(True, "Missing phone validation passed")
    else:
        log_result(False, "Missing phone validation failed", result)
        all_success = False
    
    # Test invalid SA ID
    success, result = make_request('POST', '/leads', {
        "firstName": "Test",
        "lastName": "User",
        "phone": "+27123456789",
        "saId": "1111111111111"
    }, headers=headers, expected_status=400)
    
    if success:
        log_result(True, "Invalid SA ID validation passed")
    else:
        log_result(False, "Invalid SA ID validation failed", result)
        all_success = False
    
    return all_success

def test_lead_retrieval():
    """Test 9-10: Lead retrieval and filtering"""
    log_test(9, "Lead Retrieval and Filtering")
    headers = get_auth_headers('admin')
    all_success = True
    
    # Get all leads
    success, result = make_request('GET', '/leads', headers=headers)
    if success and isinstance(result, dict) and 'leads' in result:
        leads = result['leads']
        found_test_lead = any(lead['id'] == test_lead_id for lead in leads)
        if found_test_lead:
            log_result(True, f"Lead retrieval successful, found {len(leads)} leads including test lead")
        else:
            log_result(False, "Test lead not found in results")
            all_success = False
    else:
        log_result(False, "Lead retrieval failed", result if not success else None)
        all_success = False
    
    # Test search filter
    success, result = make_request('GET', '/leads?q=Mokoena', headers=headers)
    if success and isinstance(result, dict):
        leads = result.get('leads', [])
        found_mokoena = any('Mokoena' in lead.get('lastName', '') for lead in leads)
        if found_mokoena:
            log_result(True, "Search filter working")
        else:
            log_result(False, "Search filter not working")
            all_success = False
    else:
        log_result(False, "Search filter test failed", result if not success else None)
        all_success = False
    
    # Test disposition filter
    success, result = make_request('GET', '/leads?disposition=New', headers=headers)
    if success and isinstance(result, dict):
        leads = result.get('leads', [])
        all_new = all(lead.get('disposition') == 'New' for lead in leads)
        if all_new and len(leads) > 0:
            log_result(True, "Disposition filter working")
        else:
            log_result(False, f"Disposition filter not working, found {len(leads)} leads")
            all_success = False
    else:
        log_result(False, "Disposition filter test failed", result if not success else None)
        all_success = False
    
    return all_success

def test_disposition_update():
    """Test 11: Disposition update with QA auto-trigger"""
    log_test(11, "Disposition Update with QA Auto-trigger")
    headers = get_auth_headers('admin')
    
    success, result = make_request('PATCH', f'/leads/{test_lead_id}', {
        "disposition": "Voicemail"
    }, headers=headers)
    
    if success:
        # Verify the lead was updated and qaStatus was set
        success2, result2 = make_request('GET', f'/leads/{test_lead_id}', headers=headers)
        if success2 and isinstance(result2, dict):
            lead = result2.get('lead', {})
            disposition = lead.get('disposition')
            qa_status = lead.get('qaStatus')
            if disposition == 'Voicemail' and qa_status == 'Pending':
                log_result(True, "Disposition updated and QA auto-triggered")
                return True
            else:
                log_result(False, f"Disposition: {disposition}, QA Status: {qa_status}")
                return False
        else:
            log_result(False, "Failed to verify disposition update", result2 if not success2 else None)
            return False
    else:
        log_result(False, "Disposition update failed", result)
        return False

def test_comments():
    """Test 12: Comments"""
    log_test(12, "Comments")
    headers = get_auth_headers('admin')
    
    success, result = make_request('POST', f'/leads/{test_lead_id}/comments', {
        "text": "Test note"
    }, headers=headers)
    
    if success and isinstance(result, dict) and result.get('comment'):
        log_result(True, "Comment added successfully")
        return True
    else:
        log_result(False, "Comment addition failed", result if not success else None)
        return False

def test_callbacks():
    """Test 13-14: Callbacks"""
    log_test(13, "Callback Scheduling")
    global test_callback_id
    headers = get_auth_headers('admin')
    
    # Schedule callback
    future_time = (datetime.now() + timedelta(hours=2)).isoformat()
    success, result = make_request('POST', f'/leads/{test_lead_id}/callback', {
        "scheduledAt": future_time,
        "notes": "Try later"
    }, headers=headers)
    
    if success and isinstance(result, dict) and result.get('callback', {}).get('id'):
        test_callback_id = result['callback']['id']
        log_result(True, f"Callback scheduled with ID: {test_callback_id}")
        
        # Verify lead disposition changed
        success2, result2 = make_request('GET', f'/leads/{test_lead_id}', headers=headers)
        if success2 and isinstance(result2, dict):
            disposition = result2.get('lead', {}).get('disposition')
            if disposition == 'Callback Scheduled':
                log_result(True, "Lead disposition updated to Callback Scheduled")
            else:
                log_result(False, f"Lead disposition not updated: {disposition}")
                return False
        
        # Test callback retrieval
        log_test(14, "Callback Retrieval")
        success3, result3 = make_request('GET', '/callbacks', headers=headers)
        if success3 and isinstance(result3, dict):
            callbacks = result3.get('callbacks', [])
            found_callback = any(cb['id'] == test_callback_id for cb in callbacks)
            if found_callback:
                log_result(True, "Callback retrieval successful")
                return True
            else:
                log_result(False, "Test callback not found in results")
                return False
        else:
            log_result(False, "Callback retrieval failed", result3 if not success3 else None)
            return False
    else:
        log_result(False, "Callback scheduling failed", result if not success else None)
        return False

def test_users_list():
    """Test 15: Users list"""
    log_test(15, "Users List")
    headers = get_auth_headers('admin')
    
    success, result = make_request('GET', '/users', headers=headers)
    if success and isinstance(result, dict) and 'users' in result:
        users = result['users']
        if len(users) >= 4:  # Should have at least the 4 seeded users
            log_result(True, f"Users list retrieved successfully, found {len(users)} users")
            return True
        else:
            log_result(False, f"Expected at least 4 users, found {len(users)}")
            return False
    else:
        log_result(False, "Users list retrieval failed", result if not success else None)
        return False

def test_lead_assignment():
    """Test 16-17: Lead assignment and agent scoping"""
    log_test(16, "Lead Assignment")
    headers = get_auth_headers('admin')
    
    if not agent_user_id:
        log_result(False, "Agent user ID not available")
        return False
    
    success, result = make_request('POST', f'/leads/{test_lead_id}/assign', {
        "assigneeId": agent_user_id
    }, headers=headers)
    
    if success:
        log_result(True, "Lead assigned successfully")
        
        # Test agent scoping
        log_test(17, "Agent Lead Scoping")
        agent_headers = get_auth_headers('agent')
        success2, result2 = make_request('GET', '/leads', headers=agent_headers)
        
        if success2 and isinstance(result2, dict):
            leads = result2.get('leads', [])
            assigned_lead = next((lead for lead in leads if lead['id'] == test_lead_id), None)
            if assigned_lead and assigned_lead.get('assigneeId') == agent_user_id:
                log_result(True, "Agent can see assigned lead")
                return True
            else:
                log_result(False, "Agent cannot see assigned lead or assignment not correct")
                return False
        else:
            log_result(False, "Agent lead retrieval failed", result2 if not success2 else None)
            return False
    else:
        log_result(False, "Lead assignment failed", result if not success else None)
        return False

def test_agent_disposition_update():
    """Test 18: Agent disposition update"""
    log_test(18, "Agent Disposition Update")
    agent_headers = get_auth_headers('agent')
    
    # Get the lead first
    success, result = make_request('GET', f'/leads/{test_lead_id}', headers=agent_headers)
    if not success:
        log_result(False, "Agent cannot access assigned lead", result)
        return False
    
    # Update disposition to Sale
    success2, result2 = make_request('PATCH', f'/leads/{test_lead_id}', {
        "disposition": "Sale"
    }, headers=agent_headers)
    
    if success2:
        # Verify qaStatus is Pending
        success3, result3 = make_request('GET', f'/leads/{test_lead_id}', headers=agent_headers)
        if success3 and isinstance(result3, dict):
            lead = result3.get('lead', {})
            disposition = lead.get('disposition')
            qa_status = lead.get('qaStatus')
            if disposition == 'Sale' and qa_status == 'Pending':
                log_result(True, "Agent disposition update successful, QA status set to Pending")
                return True
            else:
                log_result(False, f"Disposition: {disposition}, QA Status: {qa_status}")
                return False
        else:
            log_result(False, "Failed to verify agent disposition update", result3 if not success3 else None)
            return False
    else:
        log_result(False, "Agent disposition update failed", result2)
        return False

def test_qa_queue():
    """Test 19-21: QA queue and permissions"""
    log_test(19, "QA Queue Access")
    qa_headers = get_auth_headers('qa')
    
    success, result = make_request('GET', '/qa/queue', headers=qa_headers)
    if success and isinstance(result, dict):
        items = result.get('items', [])
        found_test_lead = any(item['id'] == test_lead_id for item in items)
        if found_test_lead:
            log_result(True, "QA queue contains test lead")
        else:
            log_result(False, "QA queue does not contain test lead")
            return False
    else:
        log_result(False, "QA queue access failed", result if not success else None)
        return False
    
    # Test QA update
    log_test(20, "QA Update")
    success2, result2 = make_request('PATCH', f'/qa/{test_lead_id}', {
        "qaStatus": "Completed",
        "qaFeedback": "Looks good"
    }, headers=qa_headers)
    
    if success2:
        log_result(True, "QA update successful")
    else:
        log_result(False, "QA update failed", result2)
        return False
    
    # Test agent QA queue access (should be forbidden)
    log_test(21, "Agent QA Queue Access (Should Fail)")
    agent_headers = get_auth_headers('agent')
    success3, result3 = make_request('GET', '/qa/queue', headers=agent_headers, expected_status=403)
    
    if success3:
        log_result(True, "Agent QA queue access correctly forbidden")
        return True
    else:
        log_result(False, "Agent QA queue access not properly restricted", result3)
        return False

def test_audit_logs():
    """Test 22-23: Audit logs"""
    log_test(22, "Audit Log Access")
    
    # Test agent access (should fail)
    agent_headers = get_auth_headers('agent')
    success, result = make_request('GET', '/audit', headers=agent_headers, expected_status=403)
    if not success:
        log_result(False, "Agent audit access test failed", result)
        return False
    
    # Test admin access (should succeed)
    admin_headers = get_auth_headers('admin')
    success2, result2 = make_request('GET', '/audit', headers=admin_headers)
    if success2 and isinstance(result2, dict) and 'logs' in result2:
        logs = result2['logs']
        # Check for expected audit entries
        actions = [log.get('action') for log in logs]
        expected_actions = ['LEAD_CREATED', 'LEAD_UPDATED', 'COMMENT_ADDED', 'CALLBACK_SCHEDULED', 'LEAD_ASSIGNED', 'QA_UPDATED']
        found_actions = [action for action in expected_actions if action in actions]
        
        if len(found_actions) >= 5:  # Should have most of the expected actions
            log_result(True, f"Admin audit access successful, found actions: {found_actions}")
        else:
            log_result(False, f"Missing audit actions. Found: {found_actions}, Expected: {expected_actions}")
            return False
    else:
        log_result(False, "Admin audit access failed", result2 if not success2 else None)
        return False
    
    # Test lead-specific audit
    log_test(23, "Lead Audit History")
    success3, result3 = make_request('GET', f'/leads/{test_lead_id}/audit', headers=admin_headers)
    if success3 and isinstance(result3, dict) and 'logs' in result3:
        logs = result3['logs']
        if len(logs) > 0:
            log_result(True, f"Lead audit history retrieved, found {len(logs)} entries")
            return True
        else:
            log_result(False, "No audit entries found for lead")
            return False
    else:
        log_result(False, "Lead audit history failed", result3 if not success3 else None)
        return False

def test_dashboard():
    """Test 24-25: Dashboard"""
    log_test(24, "Admin Dashboard")
    admin_headers = get_auth_headers('admin')
    
    success, result = make_request('GET', '/dashboard', headers=admin_headers)
    if success and isinstance(result, dict):
        required_fields = ['total', 'sales', 'callbacks', 'qaPending', 'conversionRate']
        has_all_fields = all(field in result for field in required_fields)
        if has_all_fields:
            log_result(True, f"Admin dashboard working: {result}")
        else:
            log_result(False, f"Dashboard missing fields. Got: {list(result.keys())}")
            return False
    else:
        log_result(False, "Admin dashboard failed", result if not success else None)
        return False
    
    # Test agent dashboard (scoped)
    log_test(25, "Agent Dashboard (Scoped)")
    agent_headers = get_auth_headers('agent')
    success2, result2 = make_request('GET', '/dashboard', headers=agent_headers)
    
    if success2 and isinstance(result2, dict):
        # Agent dashboard should have lower or equal counts compared to admin
        agent_total = result2.get('total', 0)
        admin_total = result.get('total', 0)
        if agent_total <= admin_total:
            log_result(True, f"Agent dashboard scoped correctly: agent={agent_total}, admin={admin_total}")
            return True
        else:
            log_result(False, f"Agent dashboard not properly scoped: agent={agent_total}, admin={admin_total}")
            return False
    else:
        log_result(False, "Agent dashboard failed", result2 if not success2 else None)
        return False

def main():
    """Run all tests"""
    print("Starting Sentinel CRM Backend API Tests")
    print(f"Base URL: {BASE_URL}")
    
    tests = [
        test_health,
        test_auth_seed,
        test_auth_login,
        test_auth_me,
        test_sa_id_validation,
        test_lead_creation,
        test_lead_validation,
        test_lead_retrieval,
        test_disposition_update,
        test_comments,
        test_callbacks,
        test_users_list,
        test_lead_assignment,
        test_agent_disposition_update,
        test_qa_queue,
        test_audit_logs,
        test_dashboard
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ FAIL: {test.__name__} - Exception: {str(e)}")
            failed += 1
    
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print('='*60)
    print(f"Total Tests: {len(tests)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {(passed/len(tests)*100):.1f}%")
    
    if failed > 0:
        print("\n❌ Some tests failed. Check the output above for details.")
        sys.exit(1)
    else:
        print("\n✅ All tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()