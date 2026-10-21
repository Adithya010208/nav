CREATE TABLE `relay_receipts` (
	`user_id` text NOT NULL,
	`notice_id` text NOT NULL,
	`received_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `notice_id`)
);
