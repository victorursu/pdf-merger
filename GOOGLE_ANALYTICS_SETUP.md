# Google Analytics Setup Guide

This guide will help you set up Google Analytics tracking for the PDF Merger application.

## Prerequisites

- A Google account
- Access to Google Analytics (analytics.google.com)

## Step 1: Create a Google Analytics Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Sign in with your Google account
3. Click **Admin** (gear icon) in the bottom left
4. In the **Property** column, click **Create Property**
5. Fill in the property details:
   - Property name: `PDF Merger` (or your preferred name)
   - Reporting time zone: Select your timezone
   - Currency: Select your currency
6. Click **Next** and complete the business information
7. Click **Create**

## Step 2: Set Up a Data Stream

1. After creating the property, you'll be prompted to set up a data stream
2. Select **Web** as the platform
3. Enter your website URL (e.g., `https://your-domain.com`)
4. Enter a stream name (e.g., `PDF Merger Web`)
5. Click **Create stream**

## Step 3: Get Your Measurement ID

1. After creating the stream, you'll see your **Measurement ID**
2. It will look like: `G-XXXXXXXXXX` (starts with G-)
3. Copy this Measurement ID - you'll need it in the next step

## Step 4: Add Measurement ID to Environment Variables

1. Open your `.env` file in the project root
2. Add the following line:
   ```
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```
   Replace `G-XXXXXXXXXX` with your actual Measurement ID

3. Also update `.env.example`:
   ```
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```

4. **Important**: If you're deploying to Vercel or another platform:
   - Add the environment variable in your deployment platform's settings
   - Use the same variable name: `NEXT_PUBLIC_GA_ID`
   - Use your actual Measurement ID as the value

## Step 5: Verify Installation

1. Deploy your application or run it locally
2. Visit your application in a browser
3. Open Google Analytics and go to **Reports** > **Realtime**
4. You should see activity appearing in real-time as you interact with the app

## Tracked Events

The application tracks the following events:

### 1. Buy Me a Coffee Click
- **Event Name**: `buy_me_coffee_clicked`
- **Triggered**: When user clicks the Buy Me a Coffee button
- **Parameters**:
  - `link_url`: The URL of the Buy Me a Coffee page

### 2. Merge PDF Button Click
- **Event Name**: `merge_pdf_clicked`
- **Triggered**: When user clicks the "Merge PDFs" button
- **Parameters**:
  - `file_count`: Number of files being merged
  - `footer_text`: The footer text entered (or "(empty)" if none)
  - `has_footer_text`: Boolean indicating if footer text was entered
  - `display_page_number`: Boolean indicating if page numbers are enabled

### 3. Footer Text Entered
- **Event Name**: `footer_text_entered`
- **Triggered**: When user types in the footer text field (debounced after 1 second)
- **Parameters**:
  - `footer_text`: The actual text entered (or "(empty)" if cleared)
  - `footer_text_length`: Length of the footer text

## Viewing Events in Google Analytics

1. Go to Google Analytics
2. Navigate to **Reports** > **Engagement** > **Events**
3. You'll see all tracked events with their parameters
4. Click on an event to see detailed information and parameters

## Custom Reports (Optional)

You can create custom reports to better visualize the data:

1. Go to **Explore** in the left sidebar
2. Click **Create new exploration**
3. Select **Free form** or **Funnel exploration**
4. Add your events as dimensions/metrics
5. Create visualizations to analyze user behavior

## Troubleshooting

### Events not appearing in Google Analytics

1. **Check environment variable**: Ensure `NEXT_PUBLIC_GA_ID` is set correctly
2. **Verify Measurement ID**: Make sure you're using the correct ID (starts with G-)
3. **Check browser console**: Open browser DevTools and look for any errors
4. **Real-time reports**: Use Real-time reports to verify events are being sent
5. **Ad blockers**: Some ad blockers may prevent Google Analytics from loading

### Testing locally

1. Make sure your `.env` file has the correct `NEXT_PUBLIC_GA_ID`
2. Restart your development server after adding the environment variable
3. Check the browser console for any errors
4. Use Google Analytics Real-time reports to verify events

## Privacy Considerations

- All tracking is done client-side
- No personal information is collected
- Footer text is tracked to understand usage patterns
- File counts are tracked for analytics purposes
- Consider adding a privacy policy if required in your jurisdiction

## Additional Resources

- [Google Analytics Documentation](https://support.google.com/analytics)
- [GA4 Event Tracking Guide](https://support.google.com/analytics/answer/9267735)
- [Next.js Google Analytics Integration](https://nextjs.org/docs/app/building-your-application/optimizing/third-party-libraries#google-analytics)
