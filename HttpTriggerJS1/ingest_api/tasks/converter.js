'use strict';

const _ = require('lodash'),
    moment = require('moment'),
    q = require('q');

function ConvertToCam() {

    let provenance = {
        informed_at: moment.utc().toISOString(),
        informer: 'Azure ASE CAM API'
    };

    function convertCAMtoCAM(cam_alarm) {
        _.merge(cam_alarm, {domain: {provenance: {azure_alarm_ingest_api: provenance}}});
        return cam_alarm
    }

    function convertTRLogV2toCAM(tr_log_alarm) {

        return tr_log_alarm //TR Log is passed straight through to CAM without conversion
    }

    function convertTRLogV4toCAM(tr_log_alarm) {

        _.merge(tr_log_alarm, {provenance: {azure_alarm_ingest_api: provenance}});
        return tr_log_alarm //TR Log is passed straight through to CAM without conversion
    }

    function convertAzuretoCAM(azure_alarm) {

        let alarm_map = {
            'Activated': 'CRITICAL',
            'Resolved': 'OK'
        };

        let occurred_at = moment.parseZone(azure_alarm.context.timestamp).toISOString();

        let status = alarm_map[azure_alarm.status];

        if (status === 'OK') {
            occurred_at = provenance.informed_at;
        }

        return {
            alarm_type: 'cloud',
            category: azure_alarm.context.condition.metricName,
            end_point_id: azure_alarm.context.resourceName,
            informer: azure_alarm.context.resourceName,
            message: azure_alarm.context.condition.metricName + ' ' + azure_alarm.context.condition.operator + ' ' + azure_alarm.context.condition.threshold + ' ' + azure_alarm.context.condition.metricUnit,
            occurred_at: occurred_at,
            reporter: 'Azure',
            status: status,
            domain: {
                cloud_account_id: azure_alarm.context.subscriptionId,
                cloud_region_name: azure_alarm.context.resourceRegion,
                cloud_namespace: azure_alarm.context.resourceType,
                cloud_raw_alarm: azure_alarm,
                provenance: {
                    azure_alarm_ingest_api: provenance
                }
            }
        };
    }


    function convertAzureHealthtoCAM(azure_alarm) {

        let alarm_map = {
            'Activated': 'CRITICAL',
            'Resolved': 'OK',
            'Active': 'CRITICAL'
        };

        return {
            alarm_type: 'cloud',
            category: azure_alarm.data.context.activityLog.properties.service + ' - ' + azure_alarm.data.context.activityLog.properties.incidentType,
            instance: azure_alarm.data.context.activityLog.subscriptionId,
            end_point_id: azure_alarm.data.context.activityLog.properties.service,
            informer: 'Azure ServiceHealth',
            message: azure_alarm.data.context.activityLog.properties.communication,
            occurred_at: moment(azure_alarm.data.context.activityLog.eventTimestamp).toISOString(),
            reporter: 'Azure_Health',
            status: alarm_map[azure_alarm.data.context.activityLog.status],
            domain: {
                cloud_region_name: azure_alarm.data.context.activityLog.properties.region,
                cloud_account_id: azure_alarm.data.context.activityLog.subscriptionId,
                cloud_raw_alarm: azure_alarm.data,
                cloud_impacted_services: JSON.parse(azure_alarm.data.context.activityLog.properties.impactedServices),
                provenance: {
                    azure_alarm_ingest_api: provenance
                }
            },
            correlation_signature: ['end_point_id', 'domain.azure_region_name', 'category', 'instance']
        };
    }

    function convertDataDogHealthToCAM(datadog_health_alarm) {

        let alarm_map = {
            'operational': 'OK',
            'degraded_performance': 'WARNING',
            'partial_outage': 'WARNING',
            'major_outage': 'CRITICAL'
        };

        return {
            alarm_type: 'cloud',
            category: datadog_health_alarm.component.name,
            end_point_id: 'DataDog',
            informer: 'DataDog ServiceHealth',
            message: datadog_health_alarm.page.status_description,
            occurred_at: moment(datadog_health_alarm.meta.generated_at).toISOString(),
            reporter: 'DataDog',
            status: alarm_map[datadog_health_alarm.component.status],
            domain: {
                cloud_region_name: 'Global',
                cloud_raw_alarm: datadog_health_alarm,
                cloud_account_id: 'All',
                cloud_namespace: datadog_health_alarm.component.name,
                provenance: {
                    azure_alarm_ingest_api: provenance
                }
            },
            correlation_signature: ['end_point_id', 'category']
        };
    }

    function convertDataDogServiceIncidentToCAM(datadog_service_incident_alarm) {

        let alarm_map = {
            'resolved': 'OK',
            'investigating': 'WARNING',
            'identified': 'CRITICAL',
            'monitoring': 'CRITICAL'
        };

        return {
            alarm_type: 'cloud',
            category: datadog_service_incident_alarm.incident.name.toLowerCase(),
            end_point_id: 'DataDog',
            informer: 'DataDog ServiceHealth',
            message: datadog_service_incident_alarm.incident.incident_updates[0].body,
            occurred_at: moment(datadog_service_incident_alarm.meta.generated_at).toISOString(),
            reporter: 'DataDog',
            status: alarm_map[datadog_service_incident_alarm.incident.status],
            domain: {
                cloud_region_name: 'Global',
                cloud_raw_alarm: datadog_service_incident_alarm,
                cloud_account_id: 'All',
                cloud_namespace: datadog_service_incident_alarm.incident.name,
                provenance: {
                    azure_alarm_ingest_api: provenance
                }
            },
            correlation_signature: ['end_point_id', 'category']
        };

    }

    this.convertToCam = function (alarm, alarm_schema, alarm_schema_version, context) {
        context.log(JSON.stringify(alarm, null, 4));
        context.log(alarm_schema);
        context.log(alarm_schema_version);
        if (alarm_schema === 'CAM' && alarm_schema_version === 2.0) {
            return q(convertCAMtoCAM(alarm));
        }
        if (alarm_schema === 'TR_Log' && alarm_schema_version === 3.0) {
            return q(convertTRLogV2toCAM(alarm));
        }
        if (alarm_schema === 'TR_Log' && alarm_schema_version === 4.0) {
            return q(convertTRLogV4toCAM(alarm));
        }
        if (alarm_schema === 'Azure Metric Alarm' && alarm_schema_version === 1.0) {
            return q(convertAzuretoCAM(alarm));
        }
        if (alarm_schema === 'Azure Service Health' && alarm_schema_version === 1.0) {
            return q(convertAzureHealthtoCAM(alarm));
        }
        if (alarm_schema === 'DataDog Service Health' && alarm_schema_version === 1.0) {
            return q(convertDataDogHealthToCAM(alarm));
        }
        if (alarm_schema === 'DataDog Service Incident' && alarm_schema_version === 1.0) {
            return q(convertDataDogServiceIncidentToCAM(alarm));
        }

    }

}


module.exports = ConvertToCam;