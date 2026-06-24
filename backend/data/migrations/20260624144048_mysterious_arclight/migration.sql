CREATE TABLE `alerts` (
	`id` text PRIMARY KEY,
	`timestamp` integer NOT NULL,
	`category` integer NOT NULL,
	`title` text NOT NULL,
	`locations` text NOT NULL,
	`description` text,
	`is_drill` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`timestamp` integer NOT NULL,
	`event` text NOT NULL,
	`details` text
);
