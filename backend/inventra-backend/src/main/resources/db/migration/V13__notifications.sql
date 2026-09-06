-- V13: Notification Center for In-App Alerts and Tracking
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_business_user ON notifications(business_id, user_id, read_at);
CREATE INDEX idx_notifications_business_store ON notifications(business_id, store_id, created_at DESC);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
