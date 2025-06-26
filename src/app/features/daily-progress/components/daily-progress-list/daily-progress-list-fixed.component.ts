// This is a temporary fix file to show the needed changes
// The viewDetails and edit methods need ID validation:

viewDetails(report: DailyProgress) {
  if (report.id) {
    this.router.navigate(['/daily-progress', report.id]);
  } else {
    console.error('Cannot view details: Report has no ID', report);
  }
}

edit(report: DailyProgress) {
  if (report.id) {
    this.router.navigate(['/daily-progress', report.id, 'edit']);
  } else {
    console.error('Cannot edit: Report has no ID', report);
  }
}