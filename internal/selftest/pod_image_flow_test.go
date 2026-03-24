package selftest_test

import (
	"context"
	"testing"

	"github.com/BarnsL/cka-practice-simulator/internal/selftest"
)

func TestRunPodImageFlow(t *testing.T) {
	report, err := selftest.RunPodImageFlow(context.Background())
	if err != nil {
		t.Fatalf("unexpected self-test error: %v", err)
	}

	if report.InjectAction != "CREATED" {
		t.Fatalf("expected injected pod to be created, got %s", report.InjectAction)
	}

	if report.BeforeRepair.Status != "FAIL" {
		t.Fatalf("expected grade before repair to fail, got %s", report.BeforeRepair.Status)
	}

	if report.AfterRepair.Status != "PASS" {
		t.Fatalf("expected grade after repair to pass, got %s", report.AfterRepair.Status)
	}
}
