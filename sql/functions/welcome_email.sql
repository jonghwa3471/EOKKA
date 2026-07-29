/**
 * Database Trigger Function: welcome_email
 * 
 * This function is triggered after a new user is inserted into the auth.users table.
 * It sends a welcome email to the newly registered user by adding a message
 * to the 'mailer' queue using PostgreSQL Message Queue (pgmq).
 * 
 * The function constructs a JSON message containing:
 * - The email template to use ('welcome')
 * - The recipient's email address (from user metadata)
 * - User data to populate the email template
 * 
 * Security considerations:
 * - Uses SECURITY DEFINER to run with the privileges of the function owner
 * - Sets an empty search path to prevent search path injection attacks
 * 
 * Dependencies:
 * - Requires the pgmq extension to be installed and configured
 * - Requires a 'mailer' queue to be created in pgmq
 * - Requires a 'welcome' email template to be defined in the application
 * 
 * @returns TRIGGER - Returns the NEW record that triggered the function
 */
CREATE OR REPLACE FUNCTION welcome_email()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
BEGIN
    -- Only enqueue fields required by the template. The complete auth.users
    -- record contains sensitive authentication fields and must not be copied.
    PERFORM pgmq.send(
            queue_name => 'mailer'::text,
            msg => jsonb_build_object(
                'template', 'welcome'::text,
                'to', new.email,
                'data', jsonb_build_object(
                    'user_id', new.id,
                    'email', new.email,
                    'name', COALESCE(
                        new.raw_user_meta_data ->> 'name',
                        new.raw_user_meta_data ->> 'full_name',
                        '사용자'
                    )
                )
            )
        );
    
    -- Return the user record that triggered this function
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.welcome_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.welcome_email() FROM anon;
REVOKE ALL ON FUNCTION public.welcome_email() FROM authenticated;

/**
 * Database Trigger: welcome_email
 * 
 * This trigger executes the welcome_email function automatically
 * after a new user is inserted into the auth.users table.
 * 
 * The trigger runs once for each row inserted (FOR EACH ROW)
 * and only activates on INSERT operations, not on UPDATE or DELETE.
 * 
 * This ensures that every new user receives a welcome email
 * without requiring explicit calls from the application code.
 */
CREATE TRIGGER welcome_email
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION welcome_email();
