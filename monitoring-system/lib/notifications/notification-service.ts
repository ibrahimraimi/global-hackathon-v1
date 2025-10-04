interface NotificationChannel {
  type: "email" | "sms" | "webhook" | "slack";
  config: Record<string, any>;
}

interface AlertRule {
  id: string;
  user_id: string;
  monitor_id?: string;
  name: string;
  condition: "down" | "slow_response" | "status_code_error";
  threshold_value?: number;
  notification_channels: NotificationChannel[];
  is_active: boolean;
}

interface NotificationPayload {
  user_id: string;
  monitor_id?: string;
  incident_id?: string;
  type: "email" | "sms" | "webhook" | "slack";
  title: string;
  message: string;
}

export class NotificationService {
  static async sendEmail(payload: NotificationPayload & { email: string }) {
    // In a real implementation, this would integrate with an email service like SendGrid, Resend, etc.
    console.log("Sending email notification:", {
      to: payload.email,
      subject: payload.title,
      body: payload.message,
    });

    // Simulate email sending
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, messageId: `email_${Date.now()}` });
      }, 1000);
    });
  }

  static async sendSMS(payload: NotificationPayload & { phoneNumber: string }) {
    // In a real implementation, this would integrate with Twilio, AWS SNS, etc.
    console.log("Sending SMS notification:", {
      to: payload.phoneNumber,
      message: `${payload.title}: ${payload.message}`,
    });

    // Simulate SMS sending
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, messageId: `sms_${Date.now()}` });
      }, 1000);
    });
  }

  static async sendWebhook(
    payload: NotificationPayload & { webhookUrl: string }
  ) {
    try {
      const response = await fetch(payload.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Monitor-Hub/1.0",
        },
        body: JSON.stringify({
          title: payload.title,
          message: payload.message,
          monitor_id: payload.monitor_id,
          incident_id: payload.incident_id,
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        success: response.ok,
        status: response.status,
        messageId: `webhook_${Date.now()}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        messageId: `webhook_${Date.now()}`,
      };
    }
  }

  static async sendSlackMessage(
    payload: NotificationPayload & { slackWebhookUrl: string }
  ) {
    try {
      const color = payload.title.toLowerCase().includes("down")
        ? "danger"
        : payload.title.toLowerCase().includes("degraded")
        ? "warning"
        : "good";

      const slackPayload = {
        attachments: [
          {
            color,
            title: payload.title,
            text: payload.message,
            fields: [
              {
                title: "Monitor ID",
                value: payload.monitor_id || "N/A",
                short: true,
              },
              {
                title: "Time",
                value: new Date().toISOString(),
                short: true,
              },
            ],
          },
        ],
      };

      const response = await fetch(payload.slackWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(slackPayload),
      });

      return {
        success: response.ok,
        status: response.status,
        messageId: `slack_${Date.now()}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        messageId: `slack_${Date.now()}`,
      };
    }
  }

  static async processAlert(
    alertRule: AlertRule,
    payload: NotificationPayload
  ) {
    const results = [];

    for (const channel of alertRule.notification_channels) {
      try {
        let result;

        switch (channel.type) {
          case "email":
            result = await this.sendEmail({
              ...payload,
              email: channel.config.email,
            });
            break;
          case "sms":
            result = await this.sendSMS({
              ...payload,
              phoneNumber: channel.config.phoneNumber,
            });
            break;
          case "webhook":
            result = await this.sendWebhook({
              ...payload,
              webhookUrl: channel.config.webhookUrl,
            });
            break;
          case "slack":
            result = await this.sendSlackMessage({
              ...payload,
              slackWebhookUrl: channel.config.slackWebhookUrl,
            });
            break;
          default:
            result = { success: false, error: "Unknown notification type" };
        }

        results.push({
          channel: channel.type,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
        });
      } catch (error: any) {
        results.push({
          channel: channel.type,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }
}
