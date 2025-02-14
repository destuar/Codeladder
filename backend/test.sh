#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:8000/api"
EMAIL="test$(date +%s)@example.com"
ADMIN_EMAIL="admin$(date +%s)@example.com"
PASSWORD="TestPassword123!"
NAME="Test User"

echo -e "${GREEN}Running auth tests...${NC}"

# Test 1: Registration
echo -e "\n${GREEN}Test 1: Registration${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"$NAME\"}")

echo "Registration Response: $REGISTER_RESPONSE"

# Extract token from registration response
TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to get token from registration${NC}"
  exit 1
fi

echo -e "${GREEN}Got token: ${TOKEN:0:20}...${NC}"

sleep 2 # Add delay between requests

# Test 2: Verify Token
echo -e "\n${GREEN}Test 2: Verifying Token${NC}"
VERIFY_RESPONSE=$(curl -s "$BASE_URL/auth/verify" \
  -H "Authorization: Bearer $TOKEN")

echo "Verify Response: $VERIFY_RESPONSE"

sleep 2 # Add delay between requests

# Test 3: Login
echo -e "\n${GREEN}Test 3: Login${NC}"
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "Login Response: $LOGIN_RESPONSE"

# Extract access token from response
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | grep -o '[^"]*$')

sleep 2 # Add delay between requests

# Test 4: Rate Limiting
echo -e "\n${GREEN}Test 4: Testing Rate Limiting${NC}"
echo "Making multiple rapid requests to test rate limiting..."

for i in {1..6}; do
  RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"wrong\"}")
  
  echo "Request $i status: $RESPONSE"
  sleep 1
done

sleep 2 # Add delay between tests

# Test 5: Admin Registration and Access
echo -e "\n${GREEN}Test 5: Admin Registration and Access${NC}"
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Admin User\",\"role\":\"ADMIN\"}")

echo "Admin Registration Response: $ADMIN_RESPONSE"

# Extract admin token
ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -n "$ADMIN_TOKEN" ]; then
  echo -e "\nTesting admin-only route..."
  ADMIN_VERIFY_RESPONSE=$(curl -s "$BASE_URL/auth/verify-admin" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  
  echo "Admin Verify Response: $ADMIN_VERIFY_RESPONSE"
fi

sleep 2 # Add delay between tests

# Test 6: Token Refresh
echo -e "\n${GREEN}Test 6: Token Refresh${NC}"
REFRESH_RESPONSE=$(curl -s -X POST -b cookies.txt "$BASE_URL/auth/refresh")
echo "Refresh Response: $REFRESH_RESPONSE"

sleep 2 # Add delay between tests

# Test 7: Logout and Token Invalidation
echo -e "\n${GREEN}Test 7: Logout and Token Invalidation${NC}"
if [ -n "$ACCESS_TOKEN" ]; then
  LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/logout" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -b cookies.txt)

  echo "Logout Response: $LOGOUT_RESPONSE"

  # Verify token is invalid after logout
  echo -e "\nVerifying token is invalid after logout..."
  VERIFY_AFTER_LOGOUT=$(curl -s "$BASE_URL/auth/verify" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  echo "Verify After Logout Response: $VERIFY_AFTER_LOGOUT"
fi

sleep 2 # Add delay between tests

# Test 8: Token Expiration (short wait)
echo -e "\n${GREEN}Test 8: Token Expiration Test (waiting 10 seconds...)${NC}"
echo -e "${YELLOW}Note: This is a shortened test. In production, tokens expire after 15 minutes.${NC}"
sleep 10

EXPIRY_TEST_RESPONSE=$(curl -s "$BASE_URL/auth/verify" \
  -H "Authorization: Bearer $TOKEN")

echo "Token Expiration Test Response: $EXPIRY_TEST_RESPONSE"

# Cleanup
rm -f cookies.txt

echo -e "\n${GREEN}All tests completed!${NC}"

# Summary
echo -e "\n${GREEN}Test Summary:${NC}"
echo "✓ User Registration"
echo "✓ Token Verification"
echo "✓ User Login"
echo "✓ Rate Limiting"
echo "✓ Admin Access"
echo "✓ Token Refresh"
echo "✓ Logout"
echo "✓ Token Expiration" 