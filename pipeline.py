import os
from dagster import job, op
from dagster_dbt import dbt_cli_resource, dbt_run_op
from dagster import DagsterInstance
from dagster import RunRecordsFilter

# Create a dummy dbt project directory
os.makedirs("dbt_project", exist_ok=True)
with open("dbt_project/dbt_project.yml", "w") as f:
    f.write("name: 'my_dbt_project'\nversion: '1.0.0'\n")

# Use a mock dbt executable or just regular Python ops to see if the issue is dbt specific
@op
def normal_op():
    pass

@job
def normal_job():
    normal_op()

if __name__ == "__main__":
    instance = DagsterInstance.ephemeral()
    result = normal_job.execute_in_process(instance=instance)
    events = instance.get_run_records(filters=RunRecordsFilter(run_ids=[result.run_id]))
    for event in events:
        print(f"Event: {event.pipeline_name} - {event.start_time} - {event.end_time}")
