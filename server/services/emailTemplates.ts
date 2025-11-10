/**
 * Email templates for notifications
 */

export const emailTemplates = {
  milestoneAchievement: (username: string, achievement: { name: string; description: string; reward: number; level?: number; badge?: string }) => ({
    subject: `🎉 Milestone Achieved: ${achievement.name}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .achievement-icon { font-size: 48px; margin: 20px 0; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
            .achievement-box { background: #f8f9fa; border: 2px solid #667eea; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
            .achievement-name { font-size: 24px; font-weight: bold; color: #667eea; margin-bottom: 10px; }
            .achievement-description { color: #666; margin-bottom: 15px; }
            .reward { background: #667eea; color: white; display: inline-block; padding: 10px 20px; border-radius: 25px; font-size: 18px; font-weight: bold; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .celebration { text-align: center; color: #667eea; font-size: 20px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎊 Congratulations, ${username}! 🎊</h1>
            </div>
            <div class="content">
              <div class="celebration">You've reached an amazing milestone!</div>
              
              <div class="achievement-box">
                <div class="achievement-icon">${achievement.badge || '🏆'}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
                <div class="reward">+${achievement.reward} Coins Earned!</div>
                ${achievement.level ? `<p style="margin-top: 15px; color: #666;">You've reached Level ${achievement.level}!</p>` : ''}
              </div>
              
              <p>Your dedication and participation in the YoForex community has earned you this special achievement. Keep up the excellent work!</p>
              
              <center>
                <a href="{app_url}/dashboard" class="button">View Your Achievements</a>
              </center>
              
              <p style="margin-top: 30px; font-style: italic; color: #666;">
                Tip: Continue engaging with the community to unlock more achievements and earn additional rewards!
              </p>
            </div>
            <div class="footer">
              <p>© 2024 YoForex. All rights reserved.</p>
              <p><a href="{unsubscribe_url}">Unsubscribe</a> from achievement notifications</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Congratulations, ${username}!

      🎉 You've achieved: ${achievement.name}

      ${achievement.description}

      Reward: +${achievement.reward} Coins
      ${achievement.level ? `Level reached: ${achievement.level}` : ''}

      Your dedication and participation in the YoForex community has earned you this special achievement.
      
      View your achievements: {app_url}/dashboard

      Keep up the excellent work!

      © 2024 YoForex
      Unsubscribe: {unsubscribe_url}
    `
  }),

  notification: (username: string, notification: any) => ({
    subject: notification.title,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>YoForex Notification</h1>
            </div>
            <div class="content">
              <h2>Hi ${username},</h2>
              <h3>${notification.title}</h3>
              <p>${notification.message}</p>
              ${notification.actionUrl ? `
                <a href="${notification.actionUrl}" class="button">View Details</a>
              ` : ''}
            </div>
            <div class="footer">
              <p>© 2024 YoForex. All rights reserved.</p>
              <p><a href="{unsubscribe_url}">Unsubscribe</a> from these notifications</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Hi ${username},

      ${notification.title}
      ${notification.message}

      ${notification.actionUrl ? `View details: ${notification.actionUrl}` : ''}

      © 2024 YoForex
      Unsubscribe: {unsubscribe_url}
    `
  }),

  dailyDigest: (username: string, notifications: any[]) => ({
    subject: `YoForex Daily Digest - ${notifications.length} updates`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
            .notification-item { border-bottom: 1px solid #e0e0e0; padding: 15px 0; }
            .notification-item:last-child { border-bottom: none; }
            .notification-type { display: inline-block; padding: 3px 8px; background: #667eea; color: white; border-radius: 3px; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Daily YoForex Digest</h1>
            </div>
            <div class="content">
              <h2>Hi ${username},</h2>
              <p>Here's what you missed in the last 24 hours:</p>
              
              ${notifications.map(n => `
                <div class="notification-item">
                  <span class="notification-type">${n.type}</span>
                  <h3 style="margin: 10px 0 5px 0;">${n.title}</h3>
                  <p style="margin: 5px 0;">${n.message}</p>
                  ${n.actionUrl ? `<a href="${n.actionUrl}">View →</a>` : ''}
                </div>
              `).join('')}
              
              <center>
                <a href="{app_url}/notifications" class="button">View All Notifications</a>
              </center>
            </div>
            <div class="footer">
              <p>© 2024 YoForex. All rights reserved.</p>
              <p><a href="{unsubscribe_url}">Unsubscribe</a> | <a href="{app_url}/settings/notifications">Notification Settings</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: notifications.map(n => `${n.type.toUpperCase()}: ${n.title}\n${n.message}\n`).join('\n---\n')
  }),

  weeklyDigest: (username: string, notifications: any[], stats: any) => ({
    subject: `YoForex Weekly Summary - ${stats.totalActivity} activities`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
            .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .stat-box { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
            .stat-number { font-size: 24px; font-weight: bold; color: #667eea; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Weekly YoForex Summary</h1>
            </div>
            <div class="content">
              <h2>Hi ${username},</h2>
              <p>Here's your activity summary for this week:</p>
              
              <div class="stats-grid">
                <div class="stat-box">
                  <div class="stat-number">${stats.totalNotifications || 0}</div>
                  <div>Notifications</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${stats.newFollowers || 0}</div>
                  <div>New Followers</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${stats.totalLikes || 0}</div>
                  <div>Likes Received</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${stats.totalReplies || 0}</div>
                  <div>Thread Replies</div>
                </div>
              </div>
              
              <h3>Recent Activity</h3>
              ${notifications.slice(0, 5).map(n => `
                <div style="border-bottom: 1px solid #e0e0e0; padding: 10px 0;">
                  <strong>${n.title}</strong><br>
                  ${n.message}
                </div>
              `).join('')}
              
              <center>
                <a href="{app_url}/dashboard" class="button">Visit Your Dashboard</a>
              </center>
            </div>
            <div class="footer">
              <p>© 2024 YoForex. All rights reserved.</p>
              <p><a href="{unsubscribe_url}">Unsubscribe</a> | <a href="{app_url}/settings/notifications">Notification Settings</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Weekly Summary - ${stats.totalActivity} activities\n\nNotifications: ${stats.totalNotifications}\nNew Followers: ${stats.newFollowers}\nLikes: ${stats.totalLikes}\nReplies: ${stats.totalReplies}`
  }),

  welcome: (username: string) => ({
    subject: 'Welcome to YoForex! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 32px; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
            .feature-list { list-style: none; padding: 0; }
            .feature-list li { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
            .feature-list li:before { content: "✓ "; color: #667eea; font-weight: bold; }
            .button { display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
            .button-secondary { background: #764ba2; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to YoForex! 🎉</h1>
            </div>
            <div class="content">
              <h2>Hi ${username},</h2>
              <p>Welcome to the YoForex community! We're thrilled to have you join us.</p>
              
              <h3>Get Started:</h3>
              <ul class="feature-list">
                <li>Complete your profile to earn your first sweets</li>
                <li>Browse our marketplace of Expert Advisors</li>
                <li>Join discussions in the forum</li>
                <li>Connect with other traders</li>
                <li>Share your trading insights</li>
              </ul>
              
              <center>
                <a href="{app_url}/profile/edit" class="button">Complete Your Profile</a>
                <a href="{app_url}/forum" class="button button-secondary">Visit Forum</a>
              </center>
              
              <p style="margin-top: 30px;">If you have any questions, feel free to reach out to our support team.</p>
            </div>
            <div class="footer">
              <p>© 2024 YoForex. All rights reserved.</p>
              <p><a href="{app_url}/settings/notifications">Notification Settings</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Welcome to YoForex, ${username}!\n\nGet started by completing your profile and exploring the forum.\n\nVisit: {app_url}`
  })
};