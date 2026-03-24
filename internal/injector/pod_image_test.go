package injector_test

import (
	"context"
	"testing"

	"github.com/BarnsL/cka-practice-simulator/internal/injector"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func TestPodImageInjector_CreatesPod(t *testing.T) {
	client := fake.NewSimpleClientset()
	inj := injector.NewPodImageInjector("default", "broken-nginx", "app", "nginx:no-such-tag")

	result, err := inj.Inject(context.Background(), client)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Action != "CREATED" {
		t.Fatalf("expected CREATED action, got %s", result.Action)
	}

	pod, err := client.CoreV1().Pods("default").Get(context.Background(), "broken-nginx", metav1.GetOptions{})
	if err != nil {
		t.Fatalf("expected pod to exist: %v", err)
	}
	if got := pod.Spec.Containers[0].Image; got != "nginx:no-such-tag" {
		t.Fatalf("expected injected image, got %q", got)
	}
}

func TestPodImageInjector_UpdatesExistingPod(t *testing.T) {
	client := fake.NewSimpleClientset(&corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: "broken-nginx", Namespace: "default"},
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{{Name: "app", Image: "nginx:1.25"}},
		},
	})
	inj := injector.NewPodImageInjector("default", "broken-nginx", "app", "nginx:no-such-tag")

	result, err := inj.Inject(context.Background(), client)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Action != "UPDATED" {
		t.Fatalf("expected UPDATED action, got %s", result.Action)
	}

	pod, err := client.CoreV1().Pods("default").Get(context.Background(), "broken-nginx", metav1.GetOptions{})
	if err != nil {
		t.Fatalf("expected pod to exist: %v", err)
	}
	if got := pod.Spec.Containers[0].Image; got != "nginx:no-such-tag" {
		t.Fatalf("expected updated image, got %q", got)
	}
}

func TestPodImageInjector_AddsContainerWhenMissing(t *testing.T) {
	client := fake.NewSimpleClientset(&corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: "broken-nginx", Namespace: "default"},
	})
	inj := injector.NewPodImageInjector("default", "broken-nginx", "app", "nginx:no-such-tag")

	if _, err := inj.Inject(context.Background(), client); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	pod, err := client.CoreV1().Pods("default").Get(context.Background(), "broken-nginx", metav1.GetOptions{})
	if err != nil {
		t.Fatalf("expected pod to exist: %v", err)
	}
	if len(pod.Spec.Containers) != 1 {
		t.Fatalf("expected one injected container, got %d", len(pod.Spec.Containers))
	}
	if pod.Spec.Containers[0].Name != "app" {
		t.Fatalf("expected injected container name app, got %q", pod.Spec.Containers[0].Name)
	}
}
