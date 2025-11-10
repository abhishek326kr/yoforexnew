// Test script for verifying the onboarding coin reward system
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const TEST_USER = {
  email: `test${Date.now()}@example.com`,
  password: 'TestPassword123!',
  username: `testuser${Date.now()}`
};

let authToken = null;
let userId = null;
let initialCoins = 0;
let currentCoins = 0;

// Helper function to make authenticated requests
async function authFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });
  return response;
}

// Test functions
async function registerUser() {
  console.log('\n=== REGISTERING TEST USER ===');
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
  });
  
  const data = await response.json();
  if (response.ok) {
    authToken = data.token;
    userId = data.user.id;
    initialCoins = data.user.totalCoins || 0;
    currentCoins = initialCoins;
    console.log(`✅ User registered: ${TEST_USER.email}`);
    console.log(`   Initial coins: ${initialCoins}`);
    return true;
  } else {
    console.error(`❌ Registration failed:`, data);
    return false;
  }
}

async function checkOnboardingProgress() {
  console.log('\n=== CHECKING ONBOARDING PROGRESS ===');
  const response = await authFetch(`${BASE_URL}/api/me/onboarding`);
  const data = await response.json();
  
  if (response.ok) {
    console.log('📊 Onboarding Progress:');
    console.log(`   - Profile Picture: ${data.onboardingProgress?.profilePicture || false} (10 coins)`);
    console.log(`   - First Reply: ${data.onboardingProgress?.firstReply || false} (5 coins)`);
    console.log(`   - Two Reviews: ${data.onboardingProgress?.twoReviews || false} (6 coins)`);
    console.log(`   - First Thread: ${data.onboardingProgress?.firstThread || false} (10 coins)`);
    console.log(`   - First Publish: ${data.onboardingProgress?.firstPublish || false} (30 coins)`);
    console.log(`   - Fifty Followers: ${data.onboardingProgress?.fiftyFollowers || false} (200 coins)`);
    console.log(`   - Total Coins: ${data.totalCoins}`);
    currentCoins = data.totalCoins;
    return data.onboardingProgress || {};
  } else {
    console.error(`❌ Failed to get onboarding progress:`, data);
    return {};
  }
}

async function completeProfile() {
  console.log('\n=== COMPLETING PROFILE (10 coins expected) ===');
  
  // Step 1: Update profile with bio and social link
  console.log('📝 Updating profile with bio and social link...');
  const updateResponse = await authFetch(`${BASE_URL}/api/user/profile`, {
    method: 'PATCH',
    body: JSON.stringify({
      displayName: TEST_USER.username,
      email: TEST_USER.email,
      bio: 'This is my test bio for profile completion',
      youtubeUrl: 'https://youtube.com/@testuser',
      instagramHandle: '@testuser',
      telegramHandle: '@testuser'
    })
  });
  
  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    console.error('❌ Profile update failed:', error);
    return false;
  }
  
  const updateData = await updateResponse.json();
  console.log('✅ Profile updated with bio and social links');
  if (updateData.totalCoinsEarned > 0) {
    console.log(`   💰 Coins earned from update: ${updateData.totalCoinsEarned}`);
  }
  
  // Step 2: Upload profile photo
  console.log('📸 Uploading profile photo...');
  // Simulate photo upload (normally would be multipart/form-data)
  // For testing, we'll use the photo upload endpoint
  const photoData = {
    profileImageUrl: '/api/images/test-photo.jpg'
  };
  
  const photoResponse = await authFetch(`${BASE_URL}/api/user/profile`, {
    method: 'PATCH',
    body: JSON.stringify(photoData)
  });
  
  if (!photoResponse.ok) {
    const error = await photoResponse.json();
    console.error('⚠️ Photo update simulation failed:', error);
  } else {
    const photoResult = await photoResponse.json();
    console.log('✅ Profile photo updated (simulated)');
    if (photoResult.totalCoinsEarned > 0) {
      console.log(`   💰 Coins earned from photo: ${photoResult.totalCoinsEarned}`);
    }
  }
  
  // Check if profile is complete and coins were awarded
  const progress = await checkOnboardingProgress();
  const profileComplete = progress.profilePicture === true;
  const coinsEarned = currentCoins - initialCoins;
  
  if (profileComplete) {
    console.log(`✅ Profile marked as complete!`);
    console.log(`   💰 Total coins earned so far: ${coinsEarned}`);
  } else {
    console.log(`⚠️ Profile not marked as complete yet`);
    console.log(`   Current progress:`, progress);
  }
  
  return profileComplete;
}

async function postFirstReply() {
  console.log('\n=== POSTING FIRST REPLY (5 coins expected) ===');
  
  // First, we need to find a thread to reply to
  const threadsResponse = await fetch(`${BASE_URL}/api/threads`);
  const threads = await threadsResponse.json();
  
  if (!threads || threads.length === 0) {
    console.log('⚠️ No threads found to reply to. Creating a thread first...');
    // Create a thread to reply to
    const createResponse = await authFetch(`${BASE_URL}/api/threads`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Thread for Reply',
        content: 'This is a test thread to enable reply testing'
      })
    });
    const newThread = await createResponse.json();
    threads.push(newThread);
  }
  
  const threadId = threads[0]?.id || threads[0]?.threadId;
  
  if (!threadId) {
    console.error('❌ No thread ID found');
    return false;
  }
  
  // Post a reply
  const replyResponse = await authFetch(`${BASE_URL}/api/threads/${threadId}/posts`, {
    method: 'POST',
    body: JSON.stringify({
      content: 'This is my first reply to test the coin reward system!'
    })
  });
  
  if (replyResponse.ok) {
    const replyData = await replyResponse.json();
    console.log('✅ First reply posted successfully');
    
    // Check if coins were awarded
    const progress = await checkOnboardingProgress();
    const replyComplete = progress.firstReply === true;
    const coinsNow = currentCoins;
    
    if (replyComplete) {
      console.log(`✅ First reply task marked as complete!`);
      console.log(`   💰 Current total coins: ${coinsNow}`);
    }
    return replyComplete;
  } else {
    const error = await replyResponse.json();
    console.error('❌ Failed to post reply:', error);
    return false;
  }
}

async function createFirstThread() {
  console.log('\n=== CREATING FIRST THREAD (10 coins expected) ===');
  
  const threadResponse = await authFetch(`${BASE_URL}/api/threads`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'My First Trading Thread - Testing Coins',
      content: 'This is my first thread to test the coin reward system. Looking forward to sharing trading insights!'
    })
  });
  
  if (threadResponse.ok) {
    const threadData = await threadResponse.json();
    console.log('✅ First thread created successfully');
    
    // Check if coins were awarded
    const progress = await checkOnboardingProgress();
    const threadComplete = progress.firstThread === true;
    const coinsNow = currentCoins;
    
    if (threadComplete) {
      console.log(`✅ First thread task marked as complete!`);
      console.log(`   💰 Current total coins: ${coinsNow}`);
    }
    return threadComplete;
  } else {
    const error = await threadResponse.json();
    console.error('❌ Failed to create thread:', error);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 ONBOARDING COIN REWARD SYSTEM TEST');
  console.log('='.repeat(60));
  
  try {
    // 1. Register user
    if (!await registerUser()) {
      console.error('❌ Registration failed, cannot continue tests');
      return;
    }
    
    // 2. Check initial onboarding status
    await checkOnboardingProgress();
    
    // 3. Complete profile (10 coins)
    await completeProfile();
    
    // 4. Post first reply (5 coins)
    await postFirstReply();
    
    // 5. Create first thread (10 coins)
    await createFirstThread();
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST SUMMARY');
    console.log('='.repeat(60));
    
    const finalProgress = await checkOnboardingProgress();
    const totalCoinsEarned = currentCoins - initialCoins;
    
    console.log(`\n💰 Coins Summary:`);
    console.log(`   - Initial coins: ${initialCoins}`);
    console.log(`   - Current coins: ${currentCoins}`);
    console.log(`   - Total earned: ${totalCoinsEarned}`);
    
    console.log(`\n✅ Completed Tasks:`);
    if (finalProgress.profilePicture) console.log(`   ✓ Profile Complete (10 coins)`);
    if (finalProgress.firstReply) console.log(`   ✓ First Reply (5 coins)`);
    if (finalProgress.firstThread) console.log(`   ✓ First Thread (10 coins)`);
    if (finalProgress.twoReviews) console.log(`   ✓ Two Reviews (6 coins)`);
    if (finalProgress.firstPublish) console.log(`   ✓ First Publish (30 coins)`);
    if (finalProgress.fiftyFollowers) console.log(`   ✓ Fifty Followers (200 coins)`);
    
    const expectedCoins = (finalProgress.profilePicture ? 10 : 0) +
                         (finalProgress.firstReply ? 5 : 0) +
                         (finalProgress.firstThread ? 10 : 0) +
                         (finalProgress.twoReviews ? 6 : 0) +
                         (finalProgress.firstPublish ? 30 : 0) +
                         (finalProgress.fiftyFollowers ? 200 : 0);
    
    console.log(`\n🎯 Validation:`);
    console.log(`   - Expected coins: ${expectedCoins}`);
    console.log(`   - Actual coins earned: ${totalCoinsEarned}`);
    
    if (totalCoinsEarned === expectedCoins) {
      console.log(`   ✅ COIN REWARDS WORKING CORRECTLY!`);
    } else {
      console.log(`   ⚠️ COIN MISMATCH - Need to investigate`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  }
}

// Run the tests
runTests();