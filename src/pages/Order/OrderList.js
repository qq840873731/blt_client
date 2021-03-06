import React, { PureComponent, Fragment } from 'react';
import { connect } from 'dva';
import moment from 'moment';
import {
  Row,
  Col,
  Card,
  Form,
  Alert,
  Input,
  AutoComplete,
  Select,
  Icon,
  Button,
  Dropdown,
  Menu,
  InputNumber,
  DatePicker,
  Modal,
  message,
  Badge,
  Divider,
  Steps,
  Radio,
  Tag,
} from 'antd';
import StandardTable from '@/components/StandardTable';
import PageHeaderWrapper from '@/components/PageHeaderWrapper';

import styles from './OrderList.less';
import { element } from 'prop-types';
import { async } from 'q';
const { RangePicker } = DatePicker;

const FormItem = Form.Item;
const { Step } = Steps;
const { TextArea } = Input;
const { Option } = Select;
const RadioGroup = Radio.Group;
const getValue = obj =>
  Object.keys(obj)
    .map(key => obj[key])
    .join(',');

const CacheSite = JSON.parse(localStorage.getItem('site') || '{}');
const CacheUser = JSON.parse(localStorage.getItem('user') || '{}');

/* eslint react/no-multi-comp:0 */
@connect(({ customer, company, trunkedorder, site, car, receiver, loading }) => {
  return {
    customer,
    company,
    trunkedorder,
    site,
    car,
    receiver,
    loading: loading.models.rule,
  };
})
@Form.create()
class TableList extends PureComponent {
  state = {
    selectedRows: [],
    formValues: {},
    current: 1,
    pageSize: 20,
    departModalVisible: false,
    currentCompany: {},
  };

  columns = [
    {
      title: '货单号',
      dataIndex: 'order_code',
      sorter: true,
      align: 'right',
      render: val => `${val}`,
      // mark to display a total number
      needTotal: true,
    },
    {
      title: '发货客户',
      dataIndex: 'sendcustomer_name',
    },
    {
      title: '收获客户',
      dataIndex: 'getcustomer_name',
      sorter: true,
    },
    {
      title: '应收货款',
      dataIndex: 'order_amount',
      sorter: true,
    },
    {
      title: '实收货款',
      dataIndex: 'order_real',
      sorter: true,
    },
    {
      title: '实收运费',
      dataIndex: 'trans_real',
      sorter: true,
    },
    {
      title: '折后运费',
      dataIndex: 'trans_discount',
      sorter: true,
    },
    {
      title: '运费方式',
      dataIndex: 'trans_type',
      sorter: true,
      render: val => `${val == 1 ? '现付' : '回付'}`,
    },
    {
      title: '垫付',
      dataIndex: 'order_advancepay_amount',
      sorter: true,
    },
    {
      title: '送货费',
      dataIndex: 'deliver_amount',
      sorter: true,
    },
    {
      title: '保价费',
      dataIndex: 'insurance_fee',
      sorter: true,
    },
    {
      title: '货物名称',
      dataIndex: 'order_name',
      sorter: true,
    },
    {
      title: '录票时间',
      dataIndex: 'create_date',
      render: val => <span>{moment(Number(val || 0)).format('YYYY-MM-DD HH:mm:ss')}</span>,
    },
    {
      title: '发车时间',
      dataIndex: 'depart_date',
      render: val => <span>{moment(Number(val || 0)).format('YYYY-MM-DD HH:mm:ss')}</span>,
    },
    {
      title: '站点',
      dataIndex: 'site_name',
      sorter: true,
    },
    {
      title: '中转',
      dataIndex: 'transfer_type',
      sorter: true,
      render: val => {
        let $transferType = '';
        if (val == 1) {
          $transferType = '转出';
        } else if (val == 2) {
          $transferType = '转入';
        }
        return $transferType;
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
    },
  ];

  async componentDidMount() {
    const { dispatch } = this.props;

    const branchCompanyList = await dispatch({
      type: 'company/getCompanyList',
      payload: {},
    });

    dispatch({
      type: 'site/getSiteListAction',
      payload: {},
    });

    // 初始渲染的是否，先加载第一个分公司的收货人信息
    if (branchCompanyList && branchCompanyList.length > 0) {
      this.setState({
        currentCompany: branchCompanyList[0],
      });

      await dispatch({
        type: 'car/getLastCarCodeAction',
        payload: {
          company_id: branchCompanyList[0].company_id,
        },
      });
    }
  }

  handleStandardTableChange = (pagination, filtersArg, sorter) => {
    const { dispatch } = this.props;
    const { formValues } = this.state;

    const filters = Object.keys(filtersArg).reduce((obj, key) => {
      const newObj = { ...obj };
      newObj[key] = getValue(filtersArg[key]);
      return newObj;
    }, {});

    const params = {
      currentPage: pagination.current,
      pageSize: pagination.pageSize,
      ...formValues,
      ...filters,
    };
    if (sorter.field) {
      params.sorter = `${sorter.field}_${sorter.order}`;
    }
  };

  handleFormReset = () => {
    const { form, dispatch } = this.props;
    form.resetFields();
    this.setState({
      formValues: {},
    });
    dispatch({
      type: 'rule/fetch',
      payload: {},
    });
  };

  handleSelectRows = rows => {
    this.setState({
      selectedRows: rows,
    });
  };

  onCompanySelect = async (value, option) => {
    const {
      dispatch,
      company: { branchCompanyList },
      form,
      car: { lastCar },
    } = this.props;

    // 自动更新货车编号
    const carInfo = await dispatch({
      type: 'car/getLastCarCodeAction',
      payload: {
        company_id: value,
      },
    });
    console.log(carInfo);
    form.setFieldsValue({
      car_code: carInfo.car_code,
    });

    const currentCompany = branchCompanyList.filter(item => {
      if (item.company_id == value) {
        return item;
      }
    });
    if (currentCompany.length > 0) {
      this.setState({
        currentCompany: currentCompany[0],
      });
    }
  };

  handleSearch = e => {
    e && e.preventDefault();

    const { dispatch, form } = this.props;
    const { currentCompany } = this.state;

    // 获取当前货车编号信息
    dispatch({
      type: 'car/getLastCarCodeAction',
      payload: {
        company_id: currentCompany.company_id,
        car_code: form.getFieldValue('car_code') || '',
      },
    });
    form.validateFields((err, fieldsValue) => {
      if (err) return;

      const filter = {};
      if (fieldsValue.company_id) {
        filter.company_id = fieldsValue.company_id;
      }

      if (fieldsValue.site_id) {
        filter.site_id = fieldsValue.site_id;
      }

      if (fieldsValue.shipsite_id) {
        filter.shipsite_id = fieldsValue.shipsite_id;
      }

      if (fieldsValue.abnormal_status) {
        filter.abnormal_status = fieldsValue.abnormal_status;
      }

      if (fieldsValue.create_date) {
        filter.create_date = [`${fieldsValue.create_date.valueOf()}`];
      }

      if (fieldsValue.entrunk_date && fieldsValue.entrunk_date.length > 0) {
        filter.entrunk_date = fieldsValue.entrunk_date.map(item => {
          return `${item.valueOf()}`;
        });
      }
      console.log(fieldsValue, filter);
      const values = {
        ...fieldsValue,
        updatedAt: fieldsValue.updatedAt && fieldsValue.updatedAt.valueOf(),
      };

      this.setState({
        formValues: values,
      });

      dispatch({
        type: 'trunkedorder/getOrderListAction',
        payload: { pageNo: 1, pageSize: 20, filter },
      });

      dispatch({
        type: 'trunkedorder/getOrderListStatisticAction',
        payload: { company_id: fieldsValue.company_id, site_id: fieldsValue.site_id },
      });
    });
  };

  renderSimpleForm() {
    const {
      form: { getFieldDecorator },
      company: { branchCompanyList },
      site: { entrunkSiteList, normalSiteList },
      car: { lastCar },
    } = this.props;
    const companyOption = {};
    // 默认勾选第一个公司
    if (branchCompanyList.length > 0) {
      companyOption.initialValue = branchCompanyList[0].company_id || '';
    }
    return (
      <Form onSubmit={this.handleSearch} layout="inline">
        <Row gutter={{ md: 8, lg: 24, xl: 48 }}>
          <Col md={8} sm={24}>
            <FormItem label="分公司">
              {getFieldDecorator('company_id', companyOption)(
                <Select
                  placeholder="请选择"
                  onSelect={this.onCompanySelect}
                  style={{ width: '100%' }}
                >
                  {branchCompanyList.map(ele => {
                    return (
                      <Option key={ele.company_id} value={ele.company_id}>
                        {ele.company_name}
                      </Option>
                    );
                  })}
                </Select>
              )}
            </FormItem>
          </Col>
          <Col md={8} sm={24}>
            <FormItem label="站点">
              {getFieldDecorator('site_id', { initialValue: CacheSite.site_id })(
                <Select placeholder="请选择" style={{ width: '100%' }}>
                  {normalSiteList.map(ele => {
                    return (
                      <Option key={ele.site_id} value={ele.site_id}>
                        {ele.site_name}
                      </Option>
                    );
                  })}
                </Select>
              )}
            </FormItem>
          </Col>
          <Col md={8} sm={24}>
            <FormItem label="配载部">
              {getFieldDecorator('shipsite_id', {})(
                <Select placeholder="请选择" style={{ width: '150px' }}>
                  {(entrunkSiteList || []).map(ele => {
                    return (
                      <Option key={ele.site_id} value={ele.site_id}>
                        {ele.site_name}
                      </Option>
                    );
                  })}
                </Select>
              )}
            </FormItem>
          </Col>
          <Col md={8} sm={24}>
            <FormItem label="异常状态">
              {getFieldDecorator('abnormal_status')(
                <Select placeholder="请选择" style={{ width: '150px' }}>
                  <Option value="1">异常</Option>
                </Select>
              )}
            </FormItem>
          </Col>
          <Col md={8} sm={24}>
            <FormItem label="录入日期">
              {getFieldDecorator('create_date', {
                initialValue: moment(new Date().getTime()),
              })(<DatePicker placeholder="请选择" format="YYYY-MM-DD" style={{ width: '100%' }} />)}
            </FormItem>
          </Col>
          <Col md={8} sm={24}>
            <FormItem label="托运日期">
              {getFieldDecorator('entrunk_date', {})(<RangePicker />)}
            </FormItem>
          </Col>
          <Col md={8} sm={24}>
            <span className={styles.submitButtons}>
              <Button type="primary" htmlType="submit">
                查询
              </Button>
            </span>
          </Col>
        </Row>
      </Form>
    );
  }

  renderForm() {
    return this.renderSimpleForm();
  }

  render() {
    const {
      trunkedorder: { orderList, total, totalOrderAmount, totalTransAmount },
      loading,
    } = this.props;

    const { selectedRows, current, pageSize, currentCompany, departModalVisible } = this.state;

    return (
      <div>
        <Card bordered={false}>
          <div className={styles.tableList}>
            <div className={styles.tableListForm}>{this.renderForm()}</div>
            <div className={styles.tableListOperator}>
              {selectedRows.length > 0 && (
                <span>
                  <Button onClick={this.onDownloadOrder}>货物清单下载</Button>
                </span>
              )}
            </div>
            <StandardTable
              selectedRows={selectedRows}
              loading={loading}
              rowKey="order_id"
              data={{
                list: orderList,
                pagination: {
                  total,
                  pageSize,
                  current,
                },
              }}
              columns={this.columns}
              onSelectRow={this.handleSelectRows}
              onChange={this.handleStandardTableChange}
              footer={() => `货款总额：${totalOrderAmount}   运费总额：${totalTransAmount}`}
            />
          </div>
        </Card>

        <Modal
          title="确认"
          visible={departModalVisible}
          onOk={this.onDepartOk}
          onCancel={this.onDepartCancel}
        >
          <p />
          <p>您确认发车么？</p>
        </Modal>
      </div>
    );
  }
}

export default TableList;
