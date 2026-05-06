#!/usr/bin/env python3
"""
Commission Engine Backend API Test for Sentinel CRM
Tests all commission endpoints according to the review request specification
"""

import requests
import json
import sys
from datetime import datetime

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
user_ids = {}
product_id = None
test_lead_ids = []
commission_ids = []

def log_test(step, description):
    """Log test step"""
    print(f"\n{'='*80}")
    print(f"TEST {step}: {description}")
    print('='*80)

def log_result(success, message, details=None):
    """Log test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if details:
        print(f"Details: {json.dumps(details, indent=2)}")

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
                return True, response.json(), response.status_code
            except:
                return True, response.text, response.status_code
        else:
            try:
                return False, response.json(), response.status_code
            except:
                return False, response.text, response.status_code
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return False, None, None

def get_auth_headers(role):
    """Get authorization headers for a role"""
    if role not in tokens:
        return None
    return {"Authorization": f"Bearer {tokens[role]}"}

def setup_auth():
    """Setup authentication for all users"""
    log_test("SETUP", "Authentication Setup")
    
    # Seed users
    success, result, status = make_request('POST', '/auth/seed')
    if not success:
        log_result(False, "Failed to seed users", {"status": status, "response": result})
        return False
    log_result(True, "Users seeded")
    
    # Login all users
    for role, creds in DEMO_USERS.items():
        success, result, status = make_request('POST', '/auth/login', {
            "email": creds["email"],
            "password": creds["password"]
        })
        
        if success and isinstance(result, dict) and result.get('token'):
            tokens[role] = result['token']
            user_ids[role] = result['user']['id']
            log_result(True, f"Login successful for {role} (ID: {user_ids[role]})")
        else:
            log_result(False, f"Login failed for {role}", {"status": status, "response": result})
            return False
    
    return True

def test_1_setup_product_with_commission():
    """Test 1: Setup product with commission config (super)"""
    log_test(1, "Setup Product with Commission Config (Super Only)")
    global product_id
    
    headers = get_auth_headers('admin')
    product_data = {
        "name": "Premium Tracker",
        "code": "PT",
        "commissionAmount": 1000,
        "splitClosingPct": 50,
        "splitCreatorPct": 30,
        "splitFieldPct": 20
    }
    
    # Create product
    success, result, status = make_request('POST', '/products', product_data, headers=headers)
    if not success or status != 200:
        log_result(False, "Failed to create product", {"status": status, "response": result})
        return False
    
    if not isinstance(result, dict) or 'product' not in result:
        log_result(False, "Invalid response format", {"response": result})
        return False
    
    product = result['product']
    product_id = product.get('id')
    
    # Verify all commission fields are present
    required_fields = ['commissionAmount', 'splitClosingPct', 'splitCreatorPct', 'splitFieldPct']
    missing_fields = [f for f in required_fields if f not in product]
    
    if missing_fields:
        log_result(False, f"Missing fields in product: {missing_fields}", {"product": product})
        return False
    
    # Verify values
    if (product['commissionAmount'] == 1000 and 
        product['splitClosingPct'] == 50 and 
        product['splitCreatorPct'] == 30 and 
        product['splitFieldPct'] == 20):
        log_result(True, f"Product created with commission config (ID: {product_id})", {"product": product})
    else:
        log_result(False, "Product commission values incorrect", {"product": product})
        return False
    
    # Verify product appears in GET /products
    success2, result2, status2 = make_request('GET', '/products', headers=headers)
    if success2 and isinstance(result2, dict) and 'products' in result2:
        products = result2['products']
        found = any(p['id'] == product_id for p in products)
        if found:
            log_result(True, "Product appears in GET /products")
            return True
        else:
            log_result(False, "Product not found in GET /products")
            return False
    else:
        log_result(False, "Failed to retrieve products", {"status": status2, "response": result2})
        return False

def test_2_auto_generation_on_sale():
    """Test 2: Auto-generation on Sale"""
    log_test(2, "Auto-generation on Sale")
    
    admin_headers = get_auth_headers('admin')
    agent_id = user_ids.get('agent')
    
    if not agent_id:
        log_result(False, "Agent user ID not available")
        return False
    
    # Create lead with Premium Tracker product
    lead_data = {
        "firstName": "Test",
        "lastName": "Customer",
        "phone": "0821111111",
        "productType": "Premium Tracker",
        "assigneeId": agent_id
    }
    
    success, result, status = make_request('POST', '/leads', lead_data, headers=admin_headers)
    if not success or status != 200:
        log_result(False, "Failed to create lead", {"status": status, "response": result})
        return False
    
    lead = result.get('lead', {})
    lead_id = lead.get('id')
    test_lead_ids.append(lead_id)
    
    # Verify creator and assignee
    if lead.get('creatorId') != user_ids['admin']:
        log_result(False, f"Creator should be admin, got: {lead.get('creatorId')}")
        return False
    
    if lead.get('assigneeId') != agent_id:
        log_result(False, f"Assignee should be agent, got: {lead.get('assigneeId')}")
        return False
    
    log_result(True, f"Lead created (ID: {lead_id}, creator=admin, assignee=agent)")
    
    # Update disposition to Sale
    success2, result2, status2 = make_request('PATCH', f'/leads/{lead_id}', {
        "disposition": "Sale"
    }, headers=admin_headers)
    
    if not success2 or status2 != 200:
        log_result(False, "Failed to update disposition to Sale", {"status": status2, "response": result2})
        return False
    
    log_result(True, "Disposition updated to Sale")
    
    # Get commissions
    success3, result3, status3 = make_request('GET', '/commissions', headers=admin_headers)
    if not success3 or status3 != 200:
        log_result(False, "Failed to retrieve commissions", {"status": status3, "response": result3})
        return False
    
    commissions = result3.get('commissions', [])
    
    # Find commission for this lead
    commission = next((c for c in commissions if c.get('leadId') == lead_id), None)
    
    if not commission:
        log_result(False, "No commission found for the lead", {"commissions": commissions})
        return False
    
    commission_ids.append(commission['id'])
    
    # Verify commission details
    errors = []
    
    if commission.get('leadName') != "Test Customer":
        errors.append(f"leadName should be 'Test Customer', got: {commission.get('leadName')}")
    
    if commission.get('totalCommission') != 1000:
        errors.append(f"totalCommission should be 1000, got: {commission.get('totalCommission')}")
    
    if commission.get('status') != "Pending Approval":
        errors.append(f"status should be 'Pending Approval', got: {commission.get('status')}")
    
    splits = commission.get('splits', [])
    
    # Should have 2 splits: closing (agent 50%) and creator (admin 30%)
    # Field 20% should NOT be included because closing user is role=agent, not field
    if len(splits) != 2:
        errors.append(f"Should have 2 splits, got: {len(splits)}")
    else:
        # Find closing split (agent)
        closing_split = next((s for s in splits if s.get('role') == 'closing'), None)
        if not closing_split:
            errors.append("Missing closing split")
        elif closing_split.get('userName') != 'Naledi Agent':
            errors.append(f"Closing user should be 'Naledi Agent', got: {closing_split.get('userName')}")
        elif closing_split.get('percent') != 50:
            errors.append(f"Closing percent should be 50, got: {closing_split.get('percent')}")
        elif closing_split.get('amount') != 500:
            errors.append(f"Closing amount should be 500, got: {closing_split.get('amount')}")
        
        # Find creator split (admin)
        creator_split = next((s for s in splits if s.get('role') == 'creator'), None)
        if not creator_split:
            errors.append("Missing creator split")
        elif creator_split.get('userName') != 'Sipho Admin':
            errors.append(f"Creator user should be 'Sipho Admin', got: {creator_split.get('userName')}")
        elif creator_split.get('percent') != 30:
            errors.append(f"Creator percent should be 30, got: {creator_split.get('percent')}")
        elif creator_split.get('amount') != 300:
            errors.append(f"Creator amount should be 300, got: {creator_split.get('amount')}")
        
        # Verify NO field split
        field_split = next((s for s in splits if s.get('role') == 'field'), None)
        if field_split:
            errors.append(f"Should NOT have field split (closing user is agent, not field), but found: {field_split}")
    
    if errors:
        log_result(False, "Commission validation failed", {"errors": errors, "commission": commission})
        return False
    else:
        log_result(True, "Commission auto-generated correctly", {"commission": commission})
        return True

def test_3_idempotency():
    """Test 3: Idempotency"""
    log_test(3, "Idempotency - No Duplicate Commission on Re-Sale")
    
    admin_headers = get_auth_headers('admin')
    lead_id = test_lead_ids[0] if test_lead_ids else None
    
    if not lead_id:
        log_result(False, "No test lead available")
        return False
    
    # Get current commission count
    success, result, status = make_request('GET', '/commissions', headers=admin_headers)
    if not success:
        log_result(False, "Failed to get commissions", {"status": status, "response": result})
        return False
    
    initial_count = len(result.get('commissions', []))
    initial_commission = next((c for c in result.get('commissions', []) if c.get('leadId') == lead_id), None)
    
    if not initial_commission:
        log_result(False, "Initial commission not found")
        return False
    
    log_result(True, f"Initial commission count: {initial_count}")
    
    # Update disposition to Sale again
    success2, result2, status2 = make_request('PATCH', f'/leads/{lead_id}', {
        "disposition": "Sale"
    }, headers=admin_headers)
    
    if not success2:
        log_result(False, "Failed to update disposition", {"status": status2, "response": result2})
        return False
    
    # Get commissions again
    success3, result3, status3 = make_request('GET', '/commissions', headers=admin_headers)
    if not success3:
        log_result(False, "Failed to get commissions after re-sale", {"status": status3, "response": result3})
        return False
    
    final_count = len(result3.get('commissions', []))
    final_commission = next((c for c in result3.get('commissions', []) if c.get('leadId') == lead_id), None)
    
    if final_count != initial_count:
        log_result(False, f"Commission count changed from {initial_count} to {final_count} (should be unchanged)")
        return False
    
    if final_commission['id'] != initial_commission['id']:
        log_result(False, "Commission ID changed (new commission created)")
        return False
    
    log_result(True, f"Idempotency verified: commission count unchanged ({final_count}), same commission preserved")
    return True

def test_4_no_product_match():
    """Test 4: Auto-generation when no product matches"""
    log_test(4, "Auto-generation with Non-Existent Product")
    
    admin_headers = get_auth_headers('admin')
    agent_id = user_ids.get('agent')
    
    # Create lead with non-existent product
    lead_data = {
        "firstName": "NoProduct",
        "lastName": "Customer",
        "phone": "0821112222",
        "productType": "NonExistentProduct",
        "assigneeId": agent_id
    }
    
    success, result, status = make_request('POST', '/leads', lead_data, headers=admin_headers)
    if not success:
        log_result(False, "Failed to create lead", {"status": status, "response": result})
        return False
    
    lead_id = result.get('lead', {}).get('id')
    test_lead_ids.append(lead_id)
    
    # Update to Sale
    success2, result2, status2 = make_request('PATCH', f'/leads/{lead_id}', {
        "disposition": "Sale"
    }, headers=admin_headers)
    
    if not success2:
        log_result(False, "Failed to update disposition", {"status": status2, "response": result2})
        return False
    
    # Get commissions
    success3, result3, status3 = make_request('GET', '/commissions', headers=admin_headers)
    if not success3:
        log_result(False, "Failed to get commissions", {"status": status3, "response": result3})
        return False
    
    commission = next((c for c in result3.get('commissions', []) if c.get('leadId') == lead_id), None)
    
    if not commission:
        log_result(False, "No commission created for non-existent product")
        return False
    
    commission_ids.append(commission['id'])
    
    # Verify totalCommission is 0
    if commission.get('totalCommission') != 0:
        log_result(False, f"totalCommission should be 0, got: {commission.get('totalCommission')}", {"commission": commission})
        return False
    
    # Splits may still exist but with 0 amounts
    log_result(True, f"Commission created with totalCommission=0 for non-existent product", {"commission": commission})
    return True

def test_5_field_agent_split():
    """Test 5: Field agent split"""
    log_test(5, "Field Agent Split")
    
    admin_headers = get_auth_headers('admin')
    field_id = user_ids.get('field')
    
    if not field_id:
        log_result(False, "Field user ID not available")
        return False
    
    # Create lead assigned to field user
    lead_data = {
        "firstName": "FieldTest",
        "lastName": "Customer",
        "phone": "0821113333",
        "productType": "Premium Tracker",
        "assigneeId": field_id
    }
    
    success, result, status = make_request('POST', '/leads', lead_data, headers=admin_headers)
    if not success:
        log_result(False, "Failed to create lead", {"status": status, "response": result})
        return False
    
    lead_id = result.get('lead', {}).get('id')
    test_lead_ids.append(lead_id)
    
    # Update to Sale
    success2, result2, status2 = make_request('PATCH', f'/leads/{lead_id}', {
        "disposition": "Sale"
    }, headers=admin_headers)
    
    if not success2:
        log_result(False, "Failed to update disposition", {"status": status2, "response": result2})
        return False
    
    # Get commissions
    success3, result3, status3 = make_request('GET', '/commissions', headers=admin_headers)
    if not success3:
        log_result(False, "Failed to get commissions", {"status": status3, "response": result3})
        return False
    
    commission = next((c for c in result3.get('commissions', []) if c.get('leadId') == lead_id), None)
    
    if not commission:
        log_result(False, "No commission found")
        return False
    
    commission_ids.append(commission['id'])
    
    splits = commission.get('splits', [])
    
    # Should have 3 splits: closing (field 50%), creator (admin 30%), field (field 20%)
    errors = []
    
    if len(splits) != 3:
        errors.append(f"Should have 3 splits, got: {len(splits)}")
    
    # Find closing split (field user)
    closing_split = next((s for s in splits if s.get('role') == 'closing'), None)
    if not closing_split:
        errors.append("Missing closing split")
    elif closing_split.get('userName') != 'Themba Field':
        errors.append(f"Closing user should be 'Themba Field', got: {closing_split.get('userName')}")
    elif closing_split.get('percent') != 50:
        errors.append(f"Closing percent should be 50, got: {closing_split.get('percent')}")
    
    # Find creator split (admin)
    creator_split = next((s for s in splits if s.get('role') == 'creator'), None)
    if not creator_split:
        errors.append("Missing creator split")
    elif creator_split.get('percent') != 30:
        errors.append(f"Creator percent should be 30, got: {creator_split.get('percent')}")
    
    # Find field split (same field user)
    field_split = next((s for s in splits if s.get('role') == 'field'), None)
    if not field_split:
        errors.append("Missing field split (closing user is field role)")
    elif field_split.get('userName') != 'Themba Field':
        errors.append(f"Field user should be 'Themba Field', got: {field_split.get('userName')}")
    elif field_split.get('percent') != 20:
        errors.append(f"Field percent should be 20, got: {field_split.get('percent')}")
    
    if errors:
        log_result(False, "Field split validation failed", {"errors": errors, "commission": commission})
        return False
    else:
        log_result(True, "Field agent split correctly included", {"commission": commission})
        return True

def test_6_approval_workflow():
    """Test 6: Approval (super only)"""
    log_test(6, "Approval Workflow (Super Only)")
    
    admin_headers = get_auth_headers('admin')
    agent_headers = get_auth_headers('agent')
    
    if len(commission_ids) < 2:
        log_result(False, "Not enough commissions for approval test")
        return False
    
    commission_id_1 = commission_ids[0]
    commission_id_2 = commission_ids[1]
    
    # Test agent approval (should fail with 403)
    success, result, status = make_request('POST', f'/commissions/{commission_id_1}/approve', 
                                          headers=agent_headers, expected_status=403)
    
    if not success or status != 403:
        log_result(False, f"Agent approval should return 403, got: {status}", {"response": result})
        return False
    
    log_result(True, "Agent approval correctly forbidden (403)")
    
    # Test admin approval (should succeed)
    success2, result2, status2 = make_request('POST', f'/commissions/{commission_id_1}/approve', 
                                              headers=admin_headers, expected_status=200)
    
    if not success2 or status2 != 200:
        log_result(False, f"Admin approval failed", {"status": status2, "response": result2})
        return False
    
    log_result(True, "Admin approval successful")
    
    # Get commission to verify status
    success3, result3, status3 = make_request('GET', '/commissions', headers=admin_headers)
    if not success3:
        log_result(False, "Failed to get commissions", {"status": status3, "response": result3})
        return False
    
    commission = next((c for c in result3.get('commissions', []) if c.get('id') == commission_id_1), None)
    
    if not commission:
        log_result(False, "Commission not found after approval")
        return False
    
    errors = []
    
    if commission.get('status') != 'Approved':
        errors.append(f"status should be 'Approved', got: {commission.get('status')}")
    
    if not commission.get('approvedBy'):
        errors.append("approvedBy should be populated")
    
    if not commission.get('approvedByName'):
        errors.append("approvedByName should be populated")
    
    if not commission.get('approvedAt'):
        errors.append("approvedAt should be populated")
    
    if errors:
        log_result(False, "Approval verification failed", {"errors": errors, "commission": commission})
        return False
    
    log_result(True, "Commission status updated correctly", {
        "status": commission.get('status'),
        "approvedBy": commission.get('approvedByName'),
        "approvedAt": commission.get('approvedAt')
    })
    
    # Test idempotent approval (approving already-approved)
    success4, result4, status4 = make_request('POST', f'/commissions/{commission_id_1}/approve', 
                                              headers=admin_headers, expected_status=200)
    
    if not success4 or status4 != 200:
        log_result(False, "Idempotent approval failed", {"status": status4, "response": result4})
        return False
    
    if result4.get('message') != 'Already approved':
        log_result(False, f"Expected 'Already approved' message, got: {result4.get('message')}")
        return False
    
    log_result(True, "Idempotent approval working (Already approved)")
    
    # Test rejection
    success5, result5, status5 = make_request('POST', f'/commissions/{commission_id_2}/reject', 
                                              headers=admin_headers, expected_status=200)
    
    if not success5 or status5 != 200:
        log_result(False, "Rejection failed", {"status": status5, "response": result5})
        return False
    
    # Verify rejection
    success6, result6, status6 = make_request('GET', '/commissions', headers=admin_headers)
    if success6:
        rejected_comm = next((c for c in result6.get('commissions', []) if c.get('id') == commission_id_2), None)
        if rejected_comm and rejected_comm.get('status') == 'Rejected':
            log_result(True, "Commission rejected successfully")
            return True
        else:
            log_result(False, "Rejection status not updated")
            return False
    else:
        log_result(False, "Failed to verify rejection")
        return False

def test_7_leaderboard():
    """Test 7: Leaderboard (any auth role)"""
    log_test(7, "Leaderboard (Any Auth Role)")
    
    all_success = True
    
    # Test leaderboard access for all roles
    for role in ['admin', 'agent', 'qa', 'field']:
        headers = get_auth_headers(role)
        success, result, status = make_request('GET', '/commissions/leaderboard', headers=headers)
        
        if not success or status != 200:
            log_result(False, f"Leaderboard access failed for {role}", {"status": status, "response": result})
            all_success = False
            continue
        
        if not isinstance(result, dict):
            log_result(False, f"Invalid response format for {role}", {"response": result})
            all_success = False
            continue
        
        if 'leaderboard' not in result or 'monthKey' not in result:
            log_result(False, f"Missing required fields for {role}", {"response": result})
            all_success = False
            continue
        
        log_result(True, f"Leaderboard accessible for {role}")
    
    # Detailed validation for admin
    admin_headers = get_auth_headers('admin')
    success, result, status = make_request('GET', '/commissions/leaderboard', headers=admin_headers)
    
    if not success:
        log_result(False, "Failed to get leaderboard for validation")
        return False
    
    leaderboard = result.get('leaderboard', [])
    month_key = result.get('monthKey')
    
    errors = []
    
    # Verify monthKey format (YYYY-MM)
    now = datetime.utcnow()
    expected_month_key = f"{now.year}-{str(now.month).zfill(2)}"
    if month_key != expected_month_key:
        errors.append(f"monthKey should be '{expected_month_key}', got: '{month_key}'")
    
    # Verify leaderboard structure
    for entry in leaderboard:
        required_fields = ['userId', 'name', 'allTime', 'month', 'deals']
        missing = [f for f in required_fields if f not in entry]
        if missing:
            errors.append(f"Entry missing fields: {missing}")
    
    # Verify only APPROVED commissions are counted (we approved one commission in test 6)
    # Rejected and pending should be excluded
    if leaderboard:
        # Check if sorted by allTime descending
        all_times = [e['allTime'] for e in leaderboard]
        if all_times != sorted(all_times, reverse=True):
            errors.append("Leaderboard not sorted by allTime descending")
    
    if errors:
        log_result(False, "Leaderboard validation failed", {"errors": errors, "leaderboard": leaderboard})
        return False
    else:
        log_result(True, "Leaderboard structure and data correct", {
            "monthKey": month_key,
            "entries": len(leaderboard)
        })
        return all_success

def test_8_role_scoping():
    """Test 8: Role scoping on /api/commissions"""
    log_test(8, "Role Scoping on /api/commissions")
    
    admin_headers = get_auth_headers('admin')
    agent_headers = get_auth_headers('agent')
    field_headers = get_auth_headers('field')
    qa_headers = get_auth_headers('qa')
    
    # Admin should see all commissions
    success, result, status = make_request('GET', '/commissions', headers=admin_headers)
    if not success:
        log_result(False, "Admin failed to get commissions", {"status": status, "response": result})
        return False
    
    admin_commissions = result.get('commissions', [])
    log_result(True, f"Admin sees all commissions: {len(admin_commissions)}")
    
    # Agent should see only their commissions
    success2, result2, status2 = make_request('GET', '/commissions', headers=agent_headers)
    if not success2:
        log_result(False, "Agent failed to get commissions", {"status": status2, "response": result2})
        return False
    
    agent_commissions = result2.get('commissions', [])
    agent_id = user_ids.get('agent')
    
    # Verify agent only sees commissions where they are in splits
    errors = []
    for comm in agent_commissions:
        splits = comm.get('splits', [])
        if not any(s.get('userId') == agent_id for s in splits):
            errors.append(f"Agent sees commission {comm.get('id')} but not in splits")
        
        # Verify splits are filtered to only agent's entries
        if not all(s.get('userId') == agent_id for s in splits):
            errors.append(f"Commission {comm.get('id')} has splits for other users")
    
    if errors:
        log_result(False, "Agent scoping failed", {"errors": errors})
        return False
    
    log_result(True, f"Agent sees only their commissions: {len(agent_commissions)}, splits filtered correctly")
    
    # Field should see only their commissions
    success3, result3, status3 = make_request('GET', '/commissions', headers=field_headers)
    if not success3:
        log_result(False, "Field failed to get commissions", {"status": status3, "response": result3})
        return False
    
    field_commissions = result3.get('commissions', [])
    field_id = user_ids.get('field')
    
    for comm in field_commissions:
        splits = comm.get('splits', [])
        if not any(s.get('userId') == field_id for s in splits):
            errors.append(f"Field sees commission {comm.get('id')} but not in splits")
    
    if errors:
        log_result(False, "Field scoping failed", {"errors": errors})
        return False
    
    log_result(True, f"Field sees only their commissions: {len(field_commissions)}")
    
    # QA should see all (no scoping for QA in MVP)
    success4, result4, status4 = make_request('GET', '/commissions', headers=qa_headers)
    if not success4:
        log_result(False, "QA failed to get commissions", {"status": status4, "response": result4})
        return False
    
    qa_commissions = result4.get('commissions', [])
    log_result(True, f"QA sees all commissions: {len(qa_commissions)}")
    
    return True

def test_9_audit_log_entries():
    """Test 9: Audit log entries"""
    log_test(9, "Audit Log Entries for Commission Actions")
    
    admin_headers = get_auth_headers('admin')
    
    success, result, status = make_request('GET', '/audit', headers=admin_headers)
    if not success:
        log_result(False, "Failed to get audit log", {"status": status, "response": result})
        return False
    
    logs = result.get('logs', [])
    actions = [log.get('action') for log in logs]
    
    expected_actions = ['COMMISSION_GENERATED', 'COMMISSION_APPROVED', 'COMMISSION_REJECTED']
    found_actions = [action for action in expected_actions if action in actions]
    
    if len(found_actions) != len(expected_actions):
        missing = [a for a in expected_actions if a not in found_actions]
        log_result(False, f"Missing audit actions: {missing}", {"found": found_actions})
        return False
    
    log_result(True, f"All commission audit actions found: {found_actions}")
    return True

def test_10_invalid_commission_id():
    """Test 10: Edge case - invalid commission id"""
    log_test(10, "Edge Case - Invalid Commission ID")
    
    admin_headers = get_auth_headers('admin')
    
    success, result, status = make_request('POST', '/commissions/invalid-id/approve', 
                                          headers=admin_headers, expected_status=404)
    
    if not success or status != 404:
        log_result(False, f"Expected 404 for invalid commission ID, got: {status}", {"response": result})
        return False
    
    log_result(True, "Invalid commission ID correctly returns 404")
    return True

def main():
    """Run all commission engine tests"""
    print("="*80)
    print("SENTINEL CRM - COMMISSION ENGINE BACKEND API TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test Time: {datetime.now().isoformat()}")
    
    # Setup
    if not setup_auth():
        print("\n❌ SETUP FAILED - Cannot proceed with tests")
        sys.exit(1)
    
    tests = [
        ("1. Setup Product with Commission Config", test_1_setup_product_with_commission),
        ("2. Auto-generation on Sale", test_2_auto_generation_on_sale),
        ("3. Idempotency", test_3_idempotency),
        ("4. No Product Match", test_4_no_product_match),
        ("5. Field Agent Split", test_5_field_agent_split),
        ("6. Approval Workflow", test_6_approval_workflow),
        ("7. Leaderboard", test_7_leaderboard),
        ("8. Role Scoping", test_8_role_scoping),
        ("9. Audit Log Entries", test_9_audit_log_entries),
        ("10. Invalid Commission ID", test_10_invalid_commission_id),
    ]
    
    passed = 0
    failed = 0
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ EXCEPTION in {test_name}: {str(e)}")
            import traceback
            traceback.print_exc()
            failed += 1
            failed_tests.append(test_name)
    
    print(f"\n{'='*80}")
    print("TEST SUMMARY")
    print('='*80)
    print(f"Total Tests: {len(tests)}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Success Rate: {(passed/len(tests)*100):.1f}%")
    
    if failed_tests:
        print(f"\nFailed Tests:")
        for test_name in failed_tests:
            print(f"  ❌ {test_name}")
    
    if failed > 0:
        print("\n❌ Some tests failed. Check the output above for details.")
        sys.exit(1)
    else:
        print("\n✅ All commission engine tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()
